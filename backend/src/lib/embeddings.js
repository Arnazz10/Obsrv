const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
const OPENAI_URL = 'https://api.openai.com/v1/embeddings';

function pickProvider() {
  return (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
}

const DIMENSIONS = 768;

// Concept groups let the offline embedder place related wording close together,
// so "database is down" lands near "DB connection refused". Words are stemmed first.
const CONCEPTS = {
  database: ['database', 'db', 'sql', 'oracle', 'query', 'queri', 'connector', 'write', 'replica', 'primary', 'failover', 'storage'],
  connection: ['connection', 'connect', 'socket', 'network', 'refused', 'refus', 'unreachable', 'reset', 'dns', 'upstream', 'downstream', 'gateway'],
  timeout: ['timeout', 'timed', 'slow', 'latency', 'delay', 'hang', 'stalled', 'p95', 'sluggish', 'wait'],
  outage: ['outage', 'down', 'unavailable', 'fail', 'failure', 'failed', 'crash', 'dead', 'broken', 'unreachable', 'responding', 'cannot', 'cant', 'unable', 'error', 'bad', '502', 'declin', 'declined'],
  payment: ['payment', 'transaction', 'billing', 'card', 'declin', 'declined', 'charge', 'processor', 'gateway', 'money'],
  checkout: ['checkout', 'order', 'cart', 'purchase', 'buy', 'submission', 'complete'],
  auth: ['auth', 'authentication', 'login', 'signin', 'token', 'session', 'credential', 'tenant', 'identity', 'provider', 'password', 'sso'],
  user: ['user', 'customer', 'client', 'people', 'visitor', 'everyone'],
  cache: ['cache', 'redis', 'miss', 'warmup', 'eviction', 'memcached'],
  capacity: ['budget', 'exhausted', 'threshold', 'limit', 'quota', 'saturated', 'memory', 'cpu', 'pool', 'utilisation', 'retry', 'approaching'],
  healthy: ['success', 'successfully', 'completed', 'finished', 'healthy', 'refreshed', 'sync', 'passed', 'check', 'ok']
};
const STOPWORDS = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'be', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'all', 'my', 'our', 'it', 'its', 'with', 'at', 'by', 'from', 'this', 'that', 'why', 'what', 'not', 'no', 'out', 'into', 'any']);

function stem(word) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

const CONCEPT_LOOKUP = new Map();
function register(word, concept) {
  const key = stem(word);
  for (const k of new Set([word, key])) {
    if (!CONCEPT_LOOKUP.has(k)) CONCEPT_LOOKUP.set(k, new Set());
    CONCEPT_LOOKUP.get(k).add(concept);
  }
}
for (const [concept, words] of Object.entries(CONCEPTS)) {
  for (const word of words) register(word, concept);
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/\b(log|sign)(ging)?[\s-]+(in|on)\b/g, 'login')
    .replace(/\bcan['’]?t\b/g, 'cannot')
    .replace(/\bdoesn['’]?t\b|\bdon['’]?t\b|\bwon['’]?t\b/g, 'fail');
}

function hashToken(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function embedLocally(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  const tokens = (normalize(text).match(/[a-z0-9]+/g) || []).filter((t) => !STOPWORDS.has(t)).map((t) => stem(t));
  const add = (feature, weight) => {
    const h = hashToken(feature);
    vector[h % DIMENSIONS] += (h & 0x10000 ? 1 : -1) * weight;
  };

  tokens.forEach((token, i) => {
    add(`w:${token}`, 1);
    if (i > 0) add(`b:${tokens[i - 1]}_${token}`, 0.35);
    for (const concept of CONCEPT_LOOKUP.get(token) || []) add(`c:${concept}`, 2.4);
  });

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export function embeddingMode() {
  const provider = pickProvider();
  if (provider === 'local') return 'local';
  if (provider === 'openai') return process.env.OPENAI_API_KEY ? 'openai' : 'local';
  return process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('replace-with') ? 'gemini' : 'local';
}

export async function embedText(text, mode = 'document') {
  const active = embeddingMode();
  if (active === 'local') return embedLocally(text);

  try {
    return active === 'openai' ? await embedWithOpenAI(text) : await embedWithGemini(text, mode);
  } catch (error) {
    // Never block ingestion or search on an external provider outage. Note that vectors
    // from different providers are not comparable, so keep one provider per database.
    console.warn(`Embedding provider failed (${error.message}); using local embeddings`);
    return embedLocally(text);
  }
}

async function embedWithGemini(text, mode) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini embeddings');
  }

  const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text }]
      },
      taskType: mode === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini embedding request failed with ${response.status}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values || data?.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini embedding response did not include embedding values');
  }

  return values;
}

async function embedWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for OpenAI embeddings');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
      dimensions: 768
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding request failed with ${response.status}`);
  }

  const data = await response.json();
  const values = data?.data?.[0]?.embedding;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('OpenAI embedding response did not include embedding values');
  }

  return values;
}
