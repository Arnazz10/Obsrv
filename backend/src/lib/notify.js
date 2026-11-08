import oracledb from 'oracledb';

const SEVERITY_LABEL = { C: 'CRITICAL', E: 'ERROR', W: 'WARNING', I: 'INFO' };

/** Inserts a notification and fans it out to the optional webhook (Slack-compatible). */
export async function createNotification(connection, { alertId = null, audience, severity, title, message, source = 'MANUAL' }) {
  const webhook = process.env.NOTIFY_WEBHOOK_URL?.trim();
  const channels = webhook ? 'in-app,webhook' : 'in-app';

  const result = await connection.execute(
    `INSERT INTO notifications (alert_id, audience, severity, title, message, source, channels)
     VALUES (:alert_id, :audience, :severity, :title, :message, :source, :channels)
     RETURNING notification_id INTO :id`,
    { alert_id: alertId, audience, severity, title: title.slice(0, 400), message: message.slice(0, 4000), source, channels, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
    { autoCommit: true }
  );

  if (webhook) {
    const target = audience === 'BOTH' ? 'Users + DBA' : audience === 'DBA' ? 'DBA' : 'Users';
    fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*[${SEVERITY_LABEL[severity]}] ${title}* (to ${target})\n${message}` })
    }).catch((error) => console.warn(`Webhook delivery failed: ${error.message}`));
  }

  return { notification_id: result.outBinds.id[0], channels };
}
