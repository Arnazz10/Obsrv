import { z } from 'zod';
import { withConnection } from '../lib/db.js';
import { createNotification } from '../lib/notify.js';
import { runDetection } from '../lib/detector.js';
import { lowerKeys } from './logs.js';

const ISO = (col) => `TO_CHAR(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const ALERT_COLS = `alert_id, alert_type, severity, service_name, region_name, title, detail, log_id, occurrences, status, ${ISO('created_at')} AS created_at, ${ISO('updated_at')} AS updated_at`;
const NOTE_COLS = `notification_id, alert_id, audience, severity, title, message, source, channels, ${ISO('created_at')} AS created_at`;

export async function listAlerts(req, res) {
  const status = String(req.query.status || '').toUpperCase();
  const data = await withConnection(async (connection) => {
    const binds = {};
    let where = '';
    if (['OPEN', 'ACKED', 'RESOLVED'].includes(status)) { where = 'WHERE status = :status'; binds.status = status; }
    const rows = await connection.execute(
      `SELECT ${ALERT_COLS} FROM alert_signals ${where} ORDER BY CASE status WHEN 'OPEN' THEN 0 WHEN 'ACKED' THEN 1 ELSE 2 END, created_at DESC FETCH FIRST 100 ROWS ONLY`, binds
    );
    const counts = await connection.execute('SELECT status, COUNT(*) AS n FROM alert_signals GROUP BY status');
    return { alerts: rows.rows.map(lowerKeys), counts: Object.fromEntries(counts.rows.map((r) => [r.STATUS, r.N])) };
  });
  res.json(data);
}

export async function updateAlert(req, res) {
  const id = Number(req.params.id);
  const status = { ack: 'ACKED', resolve: 'RESOLVED', reopen: 'OPEN' }[req.params.action];
  if (!Number.isInteger(id) || !status) return res.status(400).json({ error: 'Invalid alert action' });
  const changed = await withConnection(async (connection) => {
    const result = await connection.execute('UPDATE alert_signals SET status = :status, updated_at = SYSTIMESTAMP WHERE alert_id = :id', { status, id }, { autoCommit: true });
    return result.rowsAffected;
  });
  if (!changed) return res.status(404).json({ error: 'Alert not found' });
  return res.json({ ok: true, alert_id: id, status });
}

export async function runDetectionNow(_req, res) {
  await runDetection();
  res.json({ ok: true });
}

const notificationSchema = z.object({
  audience: z.enum(['USERS', 'DBA', 'BOTH']),
  severity: z.enum(['I', 'W', 'E', 'C']),
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(3000),
  alert_id: z.number().int().optional()
});

export async function sendNotification(req, res) {
  const parsed = notificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid notification', details: parsed.error.flatten() });
  const { alert_id: alertId, ...body } = parsed.data;
  const result = await withConnection((connection) => createNotification(connection, { ...body, alertId: alertId ?? null }));
  return res.status(201).json({ ok: true, ...result });
}

export async function listNotifications(req, res) {
  const audience = String(req.query.audience || '').toUpperCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const data = await withConnection(async (connection) => {
    // "dba" shows what the DBA team receives (DBA + BOTH); "users" shows user-facing messages.
    const filter = audience === 'DBA' ? "WHERE audience IN ('DBA', 'BOTH')" : audience === 'USERS' ? "WHERE audience IN ('USERS', 'BOTH')" : '';
    const rows = await connection.execute(`SELECT ${NOTE_COLS} FROM notifications ${filter} ORDER BY notification_id DESC FETCH FIRST :lim ROWS ONLY`, { lim: limit });
    return { notifications: rows.rows.map(lowerKeys) };
  });
  res.json(data);
}

/** Public, user-facing status: the latest user warning from the last 6 hours. */
export async function getStatus(_req, res) {
  const data = await withConnection(async (connection) => {
    const rows = await connection.execute(
      `SELECT ${NOTE_COLS} FROM notifications
       WHERE audience IN ('USERS', 'BOTH') AND created_at >= SYSTIMESTAMP - INTERVAL '6' HOUR
       ORDER BY notification_id DESC FETCH FIRST 3 ROWS ONLY`
    );
    return { notices: rows.rows.map(lowerKeys) };
  });
  res.json({ ok: data.notices.length === 0, ...data });
}
