import oracledb from 'oracledb';
import { z } from 'zod';
import { withConnection } from '../lib/db.js';
import { embedText } from '../lib/embeddings.js';
import { REGIONS } from '../lib/catalog.js';

const ingestSchema = z.object({
  timestamp: z.string().min(1),
  service: z.string().min(1),
  region: z.string().min(1),
  severity: z.enum(['I', 'W', 'E', 'C']),
  message: z.string().min(1),
  meta: z.record(z.any()).optional()
});

const regionCatalog = new Map();
for (const r of REGIONS) {
  regionCatalog.set(r.name.toLowerCase(), { name: r.name, tz: r.tz });
  regionCatalog.set(r.tz.toLowerCase(), { name: r.name, tz: r.tz });
}

function normalizeRegion(region) {
  return regionCatalog.get(String(region).trim().toLowerCase()) || { name: String(region).trim(), tz: 'UTC' };
}

const TS_FORMAT = `'YYYY-MM-DD"T"HH24:MI:SS.FF6TZH:TZM'`;

function toOracleTimestampTz(value) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().replace('Z', '+00:00');
  return String(value).replace(/z$/i, '+00:00');
}

export function lowerKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k.toLowerCase()] = v;
  return out;
}

function shapeLog(row) {
  const { payload_json, ...rest } = lowerKeys(row);
  let payload = null;
  if (payload_json) {
    try { payload = JSON.parse(payload_json); } catch { payload = null; }
  }
  return { ...rest, payload, user_impact: rest.user_impact ?? payload?.meta?.user_impact ?? null };
}

// region/service ids never change once created, so cache them to save two round trips per ingest.
const idCache = new Map();

async function resolveIds(connection, regionInfo, serviceName) {
  const key = `${regionInfo.name}|${serviceName}`;
  if (idCache.has(key)) return idCache.get(key);

  await connection.execute(
    `MERGE INTO regions r USING (SELECT :n AS n, :tz AS tz FROM dual) s ON (r.region_name = s.n)
     WHEN NOT MATCHED THEN INSERT (region_name, region_tz) VALUES (s.n, s.tz)`,
    { n: regionInfo.name, tz: regionInfo.tz },
    { autoCommit: true }
  );
  const region = await connection.execute('SELECT region_id FROM regions WHERE region_name = :n', { n: regionInfo.name });
  const regionId = region.rows[0].REGION_ID;

  await connection.execute(
    `MERGE INTO services s USING (SELECT :n AS n, :r AS r FROM dual) src
     ON (s.service_name = src.n AND s.region_id = src.r)
     WHEN NOT MATCHED THEN INSERT (service_name, region_id) VALUES (src.n, src.r)`,
    { n: serviceName, r: regionId },
    { autoCommit: true }
  );
  const service = await connection.execute(
    'SELECT service_id FROM services WHERE service_name = :n AND region_id = :r',
    { n: serviceName, r: regionId }
  );
  const ids = { regionId, serviceId: service.rows[0].SERVICE_ID };
  idCache.set(key, ids);
  return ids;
}

export async function ingestLog(req, res) {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const body = parsed.data;
  const regionInfo = normalizeRegion(body.region);
  const embedding = await embedText(body.message, 'document');

  const inserted = await withConnection(async (connection) => {
    const { regionId, serviceId } = await resolveIds(connection, regionInfo, body.service);
    const result = await connection.execute(
      `INSERT INTO logs (service_id, region_id, log_time, severity, payload, embedding)
       VALUES (:service_id, :region_id, TO_TIMESTAMP_TZ(:log_time, ${TS_FORMAT}), :severity, :payload, TO_VECTOR(:embedding))
       RETURNING log_id INTO :log_id`,
      {
        service_id: serviceId,
        region_id: regionId,
        log_time: toOracleTimestampTz(body.timestamp),
        severity: body.severity,
        payload: JSON.stringify(body),
        embedding: JSON.stringify(embedding),
        log_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      },
      { autoCommit: true }
    );
    return result.outBinds.log_id[0];
  });

  return res.status(201).json({ ok: true, log_id: inserted, region: regionInfo.name, service: body.service });
}

const SELECT_LOG = `
  SELECT
    l.log_id,
    s.service_name,
    r.region_name,
    r.region_tz,
    l.severity,
    TO_CHAR(l.log_time AT TIME ZONE r.region_tz, 'YYYY-MM-DD HH24:MI:SS') AS local_log_time,
    TO_CHAR(l.log_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS utc_time,
    JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
    JSON_VALUE(l.payload, '$.meta.user_impact' RETURNING VARCHAR2(4000)) AS user_impact,
    JSON_SERIALIZE(l.payload RETURNING CLOB) AS payload_json
  FROM logs l
  JOIN services s ON s.service_id = l.service_id
  JOIN regions r ON r.region_id = l.region_id`;

export async function searchLogs(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Query q must be at least 2 characters long' });
  }
  const severity = String(req.query.severity || '').toUpperCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);

  const queryEmbedding = JSON.stringify(await embedText(q, 'query'));
  const rows = await withConnection(async (connection) => {
    const binds = { qe: queryEmbedding, lim: limit };
    let where = '';
    if (['I', 'W', 'E', 'C'].includes(severity)) {
      where = 'WHERE l.severity = :severity';
      binds.severity = severity;
    }
    // Rank distinct messages by meaning, then report how often each one occurred.
    const result = await connection.execute(
      `WITH scored AS (
         SELECT
           l.log_id,
           l.severity,
           l.log_time,
           l.service_id,
           l.region_id,
           JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
           VECTOR_DISTANCE(l.embedding, TO_VECTOR(:qe), COSINE) AS distance
         FROM logs l
         ${where}
       ), grouped AS (
         SELECT message, severity,
                MIN(distance) AS distance,
                COUNT(*) AS occurrences,
                COUNT(DISTINCT service_id) AS service_count,
                COUNT(DISTINCT region_id) AS region_count,
                MAX(log_id) AS latest_log_id
         FROM scored
         GROUP BY message, severity
       )
       SELECT
         g.latest_log_id AS log_id, g.message, g.severity, g.distance, g.occurrences,
         g.service_count, g.region_count,
         s.service_name, r.region_name, r.region_tz,
         TO_CHAR(l.log_time AT TIME ZONE r.region_tz, 'YYYY-MM-DD HH24:MI:SS') AS local_log_time,
         TO_CHAR(l.log_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS utc_time,
         JSON_VALUE(l.payload, '$.meta.user_impact' RETURNING VARCHAR2(4000)) AS user_impact
       FROM grouped g
       JOIN logs l ON l.log_id = g.latest_log_id
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id
       ORDER BY g.distance
       FETCH FIRST :lim ROWS ONLY`,
      binds
    );
    return result.rows.map(lowerKeys);
  });

  return res.json({
    query: q,
    results: rows.map((row) => ({ ...row, similarity: Math.max(0, 1 - Number(row.distance ?? 0)) }))
  });
}

export async function browseLogs(req, res) {
  const filters = {
    region: String(req.query.region || '').trim(),
    service: String(req.query.service || '').trim(),
    severity: String(req.query.severity || '').trim(),
    from: String(req.query.from || '').trim(),
    to: String(req.query.to || '').trim(),
    text: String(req.query.text || '').trim()
  };
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const afterId = Number(req.query.after_id) || 0;

  const data = await withConnection(async (connection) => {
    const conditions = [];
    const binds = {};

    if (filters.region) { conditions.push('r.region_name = :region'); binds.region = filters.region; }
    if (filters.service) { conditions.push('s.service_name = :service'); binds.service = filters.service; }
    if (filters.severity) {
      const list = filters.severity.toUpperCase().split(',').filter((v) => ['I', 'W', 'E', 'C'].includes(v));
      if (list.length) {
        conditions.push(`l.severity IN (${list.map((_, i) => `:sev${i}`).join(', ')})`);
        list.forEach((v, i) => { binds[`sev${i}`] = v; });
      }
    }
    if (filters.from) { conditions.push(`l.log_time >= TO_TIMESTAMP_TZ(:from_time, ${TS_FORMAT})`); binds.from_time = toOracleTimestampTz(filters.from); }
    if (filters.to) { conditions.push(`l.log_time <= TO_TIMESTAMP_TZ(:to_time, ${TS_FORMAT})`); binds.to_time = toOracleTimestampTz(filters.to); }
    if (filters.text) { conditions.push(`LOWER(JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000))) LIKE :text`); binds.text = `%${filters.text.toLowerCase()}%`; }
    const since = Number(req.query.since_minutes) || 0;
    if (since > 0) { conditions.push(`l.log_time >= SYSTIMESTAMP - NUMTODSINTERVAL(:since_min, 'MINUTE')`); binds.since_min = since; }
    if (afterId) { conditions.push('l.log_id > :after_id'); binds.after_id = afterId; }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const count = await connection.execute(
      `SELECT COUNT(*) AS total FROM logs l
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id ${where}`,
      binds
    );

    const result = await connection.execute(
      `${SELECT_LOG} ${where}
       ORDER BY l.log_time DESC, l.log_id DESC
       OFFSET :off ROWS FETCH NEXT :lim ROWS ONLY`,
      { ...binds, off: offset, lim: limit }
    );

    return { total: count.rows[0].TOTAL, rows: result.rows.map(shapeLog) };
  });

  return res.json({ ...data, limit, offset });
}

export async function getLogById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid log id' });

  const data = await withConnection(async (connection) => {
    const result = await connection.execute(`${SELECT_LOG} WHERE l.log_id = :id`, { id });
    if (!result.rows.length) return null;
    const log = shapeLog(result.rows[0]);

    // Distinct, differently-worded neighbours — not copies of the same message.
    const related = await connection.execute(
      `WITH me AS (
         SELECT embedding, JSON_VALUE(payload, '$.message' RETURNING VARCHAR2(4000)) AS msg FROM logs WHERE log_id = :id
       ), g AS (
         SELECT JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
                MAX(l.log_id) AS log_id,
                MIN(VECTOR_DISTANCE(l.embedding, me.embedding, COSINE)) AS distance
         FROM logs l CROSS JOIN me
         WHERE JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) <> me.msg
         GROUP BY JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000))
       )
       SELECT g.log_id, g.message, l.severity, g.distance, s.service_name, r.region_name
       FROM g
       JOIN logs l ON l.log_id = g.log_id
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id
       ORDER BY g.distance
       FETCH FIRST 6 ROWS ONLY`,
      { id }
    );
    return { log, related: related.rows.map((row) => { const m = lowerKeys(row); return { ...m, similarity: Math.max(0, 1 - Number(m.distance ?? 0)) }; }) };
  });

  if (!data) return res.status(404).json({ error: 'Log not found' });
  return res.json(data);
}

export async function getLogsByService(req, res) {
  const service = String(req.params.service || '').trim();
  if (!service) {
    return res.status(400).json({ error: 'Service parameter is required' });
  }

  const data = await withConnection(async (connection) => {
    const result = await connection.execute(
      `${SELECT_LOG}
       WHERE s.service_name = :service_name
       ORDER BY l.log_time DESC, l.log_id DESC
       FETCH FIRST 500 ROWS ONLY`,
      { service_name: service }
    );

    const stats = await connection.execute(
      `SELECT r.region_name,
              COUNT(*) AS total,
              SUM(CASE WHEN l.severity IN ('E','C') THEN 1 ELSE 0 END) AS errors
       FROM logs l
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id
       WHERE s.service_name = :service_name AND l.log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
       GROUP BY r.region_name
       ORDER BY r.region_name`,
      { service_name: service }
    );

    return { rows: result.rows.map(shapeLog), byRegion: stats.rows.map(lowerKeys) };
  });

  return res.json({ service, ...data });
}
