import oracledb from 'oracledb';
import { withConnection } from './db.js';
import { createNotification } from './notify.js';
import { loadAnomalies } from '../routes/dashboard.js';

const CRITICAL_BURST_SQL = `
  SELECT s.service_name, r.region_name,
         JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)) AS message,
         JSON_VALUE(l.payload, '$.meta.user_impact' RETURNING VARCHAR2(1000)) AS user_impact,
         COUNT(*) AS occurrences, MAX(l.log_id) AS log_id
  FROM logs l
  JOIN services s ON s.service_id = l.service_id
  JOIN regions r ON r.region_id = l.region_id
  WHERE l.severity = 'C' AND l.log_time >= SYSTIMESTAMP - INTERVAL '15' MINUTE
  GROUP BY s.service_name, r.region_name, JSON_VALUE(l.payload, '$.message' RETURNING VARCHAR2(4000)), JSON_VALUE(l.payload, '$.meta.user_impact' RETURNING VARCHAR2(1000))
  HAVING COUNT(*) >= 3`;

async function raise(connection, alert) {
  const existing = await connection.execute('SELECT alert_id, occurrences FROM alert_signals WHERE alert_key = :k', { k: alert.key });
  if (existing.rows.length) {
    await connection.execute(
      `UPDATE alert_signals SET occurrences = :n, detail = :detail, updated_at = SYSTIMESTAMP,
              status = CASE WHEN status = 'RESOLVED' THEN 'OPEN' ELSE status END WHERE alert_key = :k`,
      { n: alert.occurrences, detail: alert.detail.slice(0, 2000), k: alert.key },
      { autoCommit: true }
    );
    return;
  }

  const inserted = await connection.execute(
    `INSERT INTO alert_signals (alert_key, alert_type, severity, service_name, region_name, title, detail, log_id, occurrences)
     VALUES (:k, :type, :sev, :service, :region, :title, :detail, :log_id, :n) RETURNING alert_id INTO :id`,
    { k: alert.key, type: alert.type, sev: alert.severity, service: alert.service, region: alert.region, title: alert.title.slice(0, 400), detail: alert.detail.slice(0, 2000), log_id: alert.logId ?? null, n: alert.occurrences, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
    { autoCommit: true }
  );
  const alertId = inserted.outBinds.id[0];

  // The DBA is paged automatically with the technical detail. Telling end users is a human call (see Alerts page).
  await createNotification(connection, {
    alertId, audience: 'DBA', severity: alert.severity, source: 'AUTO',
    title: `${alert.title}`,
    message: `${alert.detail}\n\nInvestigate: /logs/${encodeURIComponent(alert.service)}`
  });
}

export async function runDetection() {
  await withConnection(async (connection) => {
    const hourStamp = (iso) => iso.replace(/[-:TZ]/g, '').slice(0, 10);

    for (const a of await loadAnomalies(connection)) {
      await raise(connection, {
        key: `anomaly:${a.service_name}:${a.region_name}:${hourStamp(a.hour_start_utc)}`,
        type: 'ANOMALY', severity: 'C', service: a.service_name, region: a.region_name,
        title: `Error spike on ${a.service_name} (${a.region_name})`,
        detail: `${a.error_count} errors in the latest hour against a baseline of ${Number(a.baseline_avg).toFixed(1)} (${Number(a.score).toFixed(1)}σ above normal).`,
        occurrences: Number(a.error_count)
      });
    }

    const bucket = Math.floor(Date.now() / (30 * 60_000));
    const bursts = await connection.execute(CRITICAL_BURST_SQL);
    for (const row of bursts.rows) {
      await raise(connection, {
        key: `critical:${row.SERVICE_NAME}:${row.REGION_NAME}:${row.MESSAGE}:${bucket}`,
        type: 'CRITICAL', severity: 'C', service: row.SERVICE_NAME, region: row.REGION_NAME,
        title: `${row.MESSAGE} (${row.SERVICE_NAME}, ${row.REGION_NAME})`,
        detail: `${row.OCCURRENCES} critical events in the last 15 minutes.${row.USER_IMPACT ? ` Impact: ${row.USER_IMPACT}.` : ''}`,
        logId: row.LOG_ID, occurrences: Number(row.OCCURRENCES)
      });
    }

    await connection.execute(
      `UPDATE alert_signals SET status = 'RESOLVED', updated_at = SYSTIMESTAMP
       WHERE status <> 'RESOLVED' AND updated_at < SYSTIMESTAMP - INTERVAL '45' MINUTE`,
      {}, { autoCommit: true }
    );
  });
}

export function startDetector(intervalMs = 20_000) {
  const tick = () => runDetection().catch((error) => console.warn(`Detector: ${error.message}`));
  setTimeout(tick, 4000);
  return setInterval(tick, intervalMs);
}
