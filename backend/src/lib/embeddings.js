const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
const OPENAI_URL = 'https://api.openai.com/v1/embeddings';

function pickProvider() {
  return (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
}

export async function embedText(text, mode = 'document') {
  const provider = pickProvider();

  if (provider === 'openai') {
    return embedWithOpenAI(text);
  }

  return embedWithGemini(text, mode);
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
