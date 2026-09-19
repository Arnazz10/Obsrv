import crypto from 'crypto';
import { z } from 'zod';
import { withConnection } from '../lib/db.js';
import { embedText } from '../lib/embeddings.js';

const ingestSchema = z.object({
  timestamp: z.string().min(1),
  service: z.string().min(1),
  region: z.string().min(1),
  severity: z.enum(['I', 'W', 'E', 'C']),
  message: z.string().min(1),
  meta: z.record(z.any()).optional()
});

const regionCatalog = new Map([
  ['us', { name: 'US', tz: 'US/Pacific' }],
  ['us/pacific', { name: 'US', tz: 'US/Pacific' }],
  ['eu', { name: 'EU', tz: 'Europe/London' }],
  ['europe/london', { name: 'EU', tz: 'Europe/London' }],
  ['india', { name: 'India', tz: 'Asia/Kolkata' }],
  ['asia/kolkata', { name: 'India', tz: 'Asia/Kolkata' }],
  ['japan', { name: 'Japan', tz: 'Asia/Tokyo' }],
  ['asia/tokyo', { name: 'Japan', tz: 'Asia/Tokyo' }]
]);

function normalizeRegion(region) {
  const key = String(region).trim().toLowerCase();
  return regionCatalog.get(key) || { name: region, tz: 'UTC' };
}

function toOracleTimestampTz(value) {
  return String(value).replace(/z$/i, '+00:00');
}

async function ensureRegion(connection, regionName, regionTz) {
  await connection.execute(
    `MERGE INTO regions r
     USING (SELECT :region_name AS region_name, :region_tz AS region_tz FROM dual) src
     ON (r.region_name = src.region_name)
     WHEN MATCHED THEN UPDATE SET r.region_tz = src.region_tz
     WHEN NOT MATCHED THEN INSERT (region_name, region_tz)
     VALUES (src.region_name, src.region_tz)`,
    { region_name: regionName, region_tz: regionTz },
    { autoCommit: true }
  );

  const result = await connection.execute(
    `SELECT region_id, region_name, region_tz
     FROM regions
     WHERE region_name = :region_name`,
    { region_name: regionName }
  );

  return result.rows[0];
}

async function ensureService(connection, serviceName, regionId) {
  await connection.execute(
    `MERGE INTO services s
     USING (
       SELECT :service_name AS service_name, :region_id AS region_id
       FROM dual
     ) src
     ON (s.service_name = src.service_name AND s.region_id = src.region_id)
     WHEN NOT MATCHED THEN
       INSERT (service_name, region_id)
       VALUES (src.service_name, src.region_id)`,
    { service_name: serviceName, region_id: regionId },
    { autoCommit: true }
  );

  const result = await connection.execute(
    `SELECT service_id, service_name, region_id
     FROM services
     WHERE service_name = :service_name AND region_id = :region_id`,
    { service_name: serviceName, region_id: regionId }
  );

  return result.rows[0];
}

function serializePayload(body) {
  return JSON.stringify({
    timestamp: body.timestamp,
    service: body.service,
    region: body.region,
    severity: body.severity,
    message: body.message,
    ...(body.meta ? { meta: body.meta } : {})
  });
}

export async function ingestLog(req, res) {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const body = parsed.data;
  const regionInfo = normalizeRegion(body.region);
  const payload = serializePayload(body);
  const messageHash = crypto.createHash('sha256').update(body.message).digest('hex');
  const embedding = await embedText(body.message, 'document');

  const result = await withConnection(async (connection) => {
    const regionRow = await ensureRegion(connection, regionInfo.name, regionInfo.tz);
    const serviceRow = await ensureService(connection, body.service, regionRow.REGION_ID);

    const oracleTimestamp = toOracleTimestampTz(body.timestamp);
    const payloadJson = payload;
    const embeddingJson = JSON.stringify(embedding);

    const dml = `
      MERGE INTO logs l
      USING (
        SELECT
          :service_id AS service_id,
          :region_id AS region_id,
          TO_TIMESTAMP_TZ(:log_time, 'YYYY-MM-DD"T"HH24:MI:SS.FF6TZH:TZM') AS log_time,
          :severity AS severity,
          :payload AS payload,
          TO_VECTOR(:embedding) AS embedding,
          :message_hash AS message_hash
        FROM dual
      ) src
      ON (
        l.service_id = src.service_id
        AND l.log_time = src.log_time
        AND STANDARD_HASH(JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)), 'SHA256') = src.message_hash
      )
      WHEN MATCHED THEN UPDATE SET
        l.region_id = src.region_id,
        l.severity = src.severity,
        l.payload = src.payload,
        l.embedding = src.embedding
      WHEN NOT MATCHED THEN INSERT (
        log_id, service_id, region_id, log_time, severity, payload, embedding
      ) VALUES (
        log_id_seq.NEXTVAL, src.service_id, src.region_id, src.log_time, src.severity, src.payload, src.embedding
      )
    `;

    await connection.execute(
      dml,
      {
        service_id: serviceRow.SERVICE_ID,
        region_id: regionRow.REGION_ID,
        log_time: oracleTimestamp,
        severity: body.severity,
        payload: payloadJson,
        embedding: embeddingJson,
        message_hash: messageHash
      },
      { autoCommit: true }
    );

    return {
      region: regionRow,
      service: serviceRow
    };
  });

  return res.status(201).json({
    ok: true,
    region: result.region.REGION_NAME,
    service: result.service.SERVICE_NAME,
    messageHash
  });
}

export async function searchLogs(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Query q must be at least 2 characters long' });
  }

  const queryEmbedding = await embedText(q, 'query');
  const rows = await withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT
         l.log_id,
         s.service_name,
         r.region_name,
         r.region_tz,
         l.severity,
         TO_CHAR(l.log_time AT TIME ZONE r.region_tz, 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS local_log_time,
         JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
         VECTOR_DISTANCE(l.embedding, TO_VECTOR(:query_embedding), COSINE) AS distance
       FROM logs l
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id
       ORDER BY VECTOR_DISTANCE(l.embedding, TO_VECTOR(:query_embedding), COSINE)
       FETCH FIRST 10 ROWS ONLY`,
      { query_embedding: JSON.stringify(queryEmbedding) }
    );

    return result.rows;
  });

  return res.json({ query: q, results: rows.map((row) => ({ ...row, similarity: Math.max(0, 1 - Number(row.DISTANCE ?? 0)) })) });
}

export async function browseLogs(req, res) {
  const filters = {
    region: String(req.query.region || '').trim(),
    service: String(req.query.service || '').trim(),
    severity: String(req.query.severity || '').trim(),
    from: String(req.query.from || '').trim(),
    to: String(req.query.to || '').trim()
  };

  const rows = await withConnection(async (connection) => {
    const conditions = [];
    const binds = {};

    if (filters.region) {
      conditions.push('r.region_name = :region');
      binds.region = filters.region;
    }

    if (filters.service) {
      conditions.push('s.service_name = :service');
      binds.service = filters.service;
    }

    if (filters.severity) {
      conditions.push('l.severity = :severity');
      binds.severity = filters.severity.toUpperCase();
    }

    if (filters.from) {
      conditions.push(`l.log_time >= TO_TIMESTAMP_TZ(:from_time, 'YYYY-MM-DD"T"HH24:MI:SS.FF6TZH:TZM')`);
      binds.from_time = toOracleTimestampTz(filters.from);
    }

    if (filters.to) {
      conditions.push(`l.log_time <= TO_TIMESTAMP_TZ(:to_time, 'YYYY-MM-DD"T"HH24:MI:SS.FF6TZH:TZM')`);
      binds.to_time = toOracleTimestampTz(filters.to);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await connection.execute(
      `SELECT
         l.log_id,
         s.service_name,
         r.region_name,
         r.region_tz,
         l.severity,
         TO_CHAR(l.log_time AT TIME ZONE r.region_tz, 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS local_log_time,
         JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
         JSON_SERIALIZE(l.payload RETURNING CLOB) AS payload_json
       FROM logs l
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id
       CROSS JOIN JSON_TABLE(
         l.payload,
         '$'
         COLUMNS (
           message VARCHAR2(4000) PATH '$.message'
         )
       ) jt
       ${whereClause}
       ORDER BY l.log_time DESC
       FETCH FIRST 250 ROWS ONLY`,
      binds
    );

    return result.rows;
  });

  return res.json({ rows: rows.map((row) => ({
    ...row,
    payload: row.PAYLOAD_JSON ? JSON.parse(row.PAYLOAD_JSON) : null
  })) });
}

export async function getLogsByService(req, res) {
  const service = String(req.params.service || '').trim();
  if (!service) {
    return res.status(400).json({ error: 'Service parameter is required' });
  }

  const rows = await withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT
         l.log_id,
         s.service_name,
         r.region_name,
         r.region_tz,
         l.severity,
         TO_CHAR(l.log_time AT TIME ZONE r.region_tz, 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS local_log_time,
         JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
         JSON_VALUE(l.payload, '$.meta.user_impact' RETURNING VARCHAR2(4000)) AS user_impact,
         JSON_SERIALIZE(l.payload RETURNING CLOB) AS payload_json
       FROM logs l
       JOIN services s ON s.service_id = l.service_id
       JOIN regions r ON r.region_id = l.region_id
       WHERE s.service_name = :service_name
       ORDER BY l.log_time DESC
       FETCH FIRST 500 ROWS ONLY`,
      { service_name: service }
    );

    return result.rows;
  });

  return res.json({
    service,
    rows: rows.map((row) => ({
      ...row,
      payload: row.PAYLOAD_JSON ? JSON.parse(row.PAYLOAD_JSON) : null
    }))
  });
}
