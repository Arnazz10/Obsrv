import oracledb from 'oracledb';
import { getPool, shutdownPool } from './lib/db.js';
import { embedText, embeddingMode } from './lib/embeddings.js';
import { REGIONS, SERVICES, buildEvent, pick } from './lib/catalog.js';

const HOURS = Number(process.env.SEED_HOURS || 48);
const PER_HOUR = Number(process.env.SEED_PER_HOUR || 600);
const reset = process.argv.includes('--reset');

const pool = await getPool();
const conn = await pool.getConnection();
console.log(`Seeding ${HOURS}h of history (embeddings: ${embeddingMode()})`);

try {
  if (reset) {
    for (const t of ['notifications', 'alert_signals']) { try { await conn.execute(`DELETE FROM ${t}`); } catch { /* table not created yet */ } }
    await conn.execute('DELETE FROM alerts');
    await conn.execute('DELETE FROM logs');
    await conn.commit();
    console.log('Cleared existing logs');
  } else {
    const { rows } = await conn.execute('SELECT COUNT(*) AS n FROM logs');
    if (rows[0].N > 0) {
      console.log(`Logs table already has ${rows[0].N} rows. Use --reset to replace them.`);
      process.exit(0);
    }
  }

  const ids = new Map();
  for (const r of REGIONS) {
    await conn.execute(
      `MERGE INTO regions t USING (SELECT :n AS n, :tz AS tz FROM dual) s ON (t.region_name = s.n)
       WHEN MATCHED THEN UPDATE SET t.region_tz = s.tz
       WHEN NOT MATCHED THEN INSERT (region_name, region_tz) VALUES (s.n, s.tz)`,
      { n: r.name, tz: r.tz }
    );
    const { rows } = await conn.execute('SELECT region_id FROM regions WHERE region_name = :n', { n: r.name });
    const regionId = rows[0].REGION_ID;
    ids.set(r.name, { regionId, services: new Map() });
    for (const s of SERVICES) {
      await conn.execute(
        `MERGE INTO services t USING (SELECT :n AS n, :r AS r FROM dual) s
         ON (t.service_name = s.n AND t.region_id = s.r)
         WHEN NOT MATCHED THEN INSERT (service_name, region_id) VALUES (s.n, s.r)`,
        { n: s.name, r: regionId }
      );
      const res = await conn.execute(
        'SELECT service_id FROM services WHERE service_name = :n AND region_id = :r',
        { n: s.name, r: regionId }
      );
      ids.get(r.name).services.set(s.name, res.rows[0].SERVICE_ID);
    }
  }
  await conn.commit();

  const embeddings = new Map();
  const vectorFor = async (message) => {
    if (!embeddings.has(message)) embeddings.set(message, JSON.stringify(await embedText(message, 'document')));
    return embeddings.get(message);
  };

  // Each region/service pair has its own noise level, and a couple of incidents are
  // injected so the anomaly panel and error map have something real to show.
  const now = Date.now();
  const hotspot = { region: 'India', service: 'payment-gateway' };
  const secondary = { region: 'EU', service: 'db-connector' };
  const rows = [];

  for (let h = HOURS; h >= 0; h -= 1) {
    const hourStart = now - h * 3600_000;
    const count = Math.round(PER_HOUR * (0.7 + Math.random() * 0.6));
    for (let i = 0; i < count; i += 1) {
      const ts = new Date(hourStart - Math.random() * 3600_000);
      let region = pick(REGIONS);
      let service = pick(SERVICES);
      let weights;
      const spike = h <= 1 && Math.random() < 0.28;
      if (spike) {
        const target = Math.random() < 0.75 ? hotspot : secondary;
        region = REGIONS.find((r) => r.name === target.region);
        service = SERVICES.find((s) => s.name === target.service);
        weights = { I: 0.05, W: 0.1, E: 0.65, C: 0.2 };
      }
      rows.push({ event: buildEvent({ region, service, timestamp: ts, weights }), region, service });
    }
  }

  const binds = [];
  for (const { event, region, service } of rows) {
    binds.push({
      service_id: ids.get(region.name).services.get(service.name),
      region_id: ids.get(region.name).regionId,
      log_time: event.timestamp,
      severity: event.severity,
      payload: JSON.stringify(event),
      embedding: await vectorFor(event.message)
    });
  }

  const BATCH = 500;
  for (let i = 0; i < binds.length; i += BATCH) {
    await conn.executeMany(
      `INSERT INTO logs (service_id, region_id, log_time, severity, payload, embedding)
       VALUES (:service_id, :region_id,
               TO_TIMESTAMP_TZ(:log_time, 'YYYY-MM-DD"T"HH24:MI:SS.FF6TZH:TZM'),
               :severity, :payload, TO_VECTOR(:embedding))`,
      binds.slice(i, i + BATCH),
      {
        bindDefs: {
          service_id: { type: oracledb.NUMBER },
          region_id: { type: oracledb.NUMBER },
          log_time: { type: oracledb.STRING, maxSize: 64 },
          severity: { type: oracledb.STRING, maxSize: 1 },
          payload: { type: oracledb.STRING, maxSize: 4000 },
          embedding: { type: oracledb.STRING, maxSize: 32000 }
        },
        autoCommit: true
      }
    );
    process.stdout.write(`\r  inserted ${Math.min(i + BATCH, binds.length)}/${binds.length}`);
  }
  console.log('\nDone.');
} finally {
  await conn.close();
  await shutdownPool();
}
