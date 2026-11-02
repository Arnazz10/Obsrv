"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getJson } from '../../lib/api';

const STORAGE_KEY = 'obsrv-incident-updates-v1';

function getField(row, key) { return row[key] ?? row[key.toLowerCase()]; }
function severityName(value) { return ({ C: 'Critical', E: 'High', W: 'Warning', I: 'Info' })[value] || value || 'Unknown'; }
function Severity({ value }) {
  const tone = value === 'C' ? 'critical' : value === 'E' ? 'high' : value === 'W' ? 'warning' : 'info';
  return <span className={`severity severity-${tone}`}>{severityName(value)}</span>;
}

export default function IncidentsPage() {
  const [logs, setLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [status, setStatus] = useState('loading');
  const [updates, setUpdates] = useState([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({ title: '', audience: 'Users and DBA', message: '', severity: 'W' });

  useEffect(() => {
    try { setUpdates(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { setUpdates([]); }
    Promise.all([getJson('/api/logs'), getJson('/api/dashboard/summary')]).then(([logData, summary]) => {
      setLogs(logData.rows || []); setAnomalies(summary.anomalies || []); setStatus('online');
    }).catch(() => setStatus('offline'));
  }, []);

  const alerts = useMemo(() => {
    const elevated = logs.filter((row) => ['C', 'E', 'W'].includes(getField(row, 'SEVERITY'))).map((row) => ({
      id: `log-${getField(row, 'LOG_ID')}`, title: getField(row, 'MESSAGE') || 'Elevated severity event', service: getField(row, 'SERVICE_NAME') || 'Unknown service', region: getField(row, 'REGION_NAME') || 'Unknown region', severity: getField(row, 'SEVERITY'), time: getField(row, 'LOCAL_LOG_TIME'),
      impact: getField(row, 'USER_IMPACT')
    }));
    const detected = anomalies.map((row, index) => ({ id: `anomaly-${index}`, title: 'Unusual error volume', service: getField(row, 'SERVICE_NAME') || 'Unknown service', region: getField(row, 'REGION_NAME') || 'Unknown region', severity: 'E', time: getField(row, 'HOUR_START_UTC'), impact: `${getField(row, 'ERROR_COUNT') || 0} errors in the latest hourly window` }));
    const seen = new Set();
    return [...detected, ...elevated].filter((item) => { const key = `${item.service}|${item.title}|${item.time}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }, [logs, anomalies]);

  const visible = filter === 'All' ? alerts : alerts.filter((alert) => severityName(alert.severity) === filter);
  function updateField(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function createUpdate(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    const next = [{ ...form, id: `${Date.now()}`, createdAt: new Date().toISOString(), state: 'Draft' }, ...updates];
    setUpdates(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep the draft visible for this session. */ }
    setDraftSaved(true); window.setTimeout(() => setDraftSaved(false), 2600);
    setForm({ title: '', audience: 'Users and DBA', message: '', severity: 'W' });
  }

  return <div className="security-dashboard incidents-page">
    <div className="dashboard-title"><div><div className="eyebrow">OPERATIONS · INCIDENT RESPONSE</div><h1>Alerts & communications</h1><p>Review elevated events and prepare clear service updates for users and database operators.</p></div><Link href="/logs" className="refresh-button">Browse event log →</Link></div>
    <div className="incident-status-row"><div><span className={`incident-status-dot ${status}`}/><b>{status === 'online' ? 'Monitoring active' : status === 'loading' ? 'Loading current signals' : 'Live signal feed unavailable'}</b><span>{status === 'online' ? `${alerts.length} elevated signals in the latest 250 records` : status === 'offline' ? 'Connect the API to populate live alerts' : 'Checking event and anomaly feeds'}</span></div><span className="local-data-label">Communications are saved as local drafts</span></div>
    <div className="incident-layout">
      <section className="panel incident-feed"><div className="panel-heading"><div><h2>Active signals</h2><span className="panel-caption">Warnings, high severity, critical events, and detected anomalies</span></div><span className="feed-count">{visible.length}</span></div>
        <div className="incident-filter" role="group" aria-label="Filter alerts">{['All', 'Critical', 'High', 'Warning'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}{item === 'All' ? <span>{alerts.length}</span> : <span>{alerts.filter((alert) => severityName(alert.severity) === item).length}</span>}</button>)}</div>
        <div className="incident-list">{visible.map((alert) => <article className="incident-item" key={alert.id}><span className={`incident-rail ${alert.severity === 'C' ? 'critical' : alert.severity === 'E' ? 'high' : 'warning'}`}/><div className="incident-copy"><div className="incident-heading"><b>{alert.title}</b><Severity value={alert.severity}/></div><div className="incident-meta"><Link href={`/logs/${encodeURIComponent(alert.service)}`}>{alert.service}</Link><span>·</span><span>{alert.region}</span>{alert.time && <><span>·</span><time>{alert.time}</time></>}</div><p>{alert.impact || 'Review this event and confirm whether it requires user communication.'}</p></div><Link className="incident-open" href={`/logs/${encodeURIComponent(alert.service)}`} aria-label={`Inspect ${alert.service}`}>↗</Link></article>)}
        {visible.length === 0 && <div className="incident-empty"><span>✓</span><b>{status === 'online' ? 'No matching active signals' : 'Signal feed not available'}</b><p>{status === 'online' ? 'The selected severity has no events in the current log window.' : 'When the API reconnects, warnings and anomalies will appear here.'}</p></div>}</div>
      </section>
      <div className="communication-column">
        <section className="panel compose-panel"><div className="panel-heading"><div><h2>Prepare a service update</h2><span className="panel-caption">Create a message for review and sharing</span></div><span className="draft-tag">DRAFT</span></div>
          <form className="communication-form" onSubmit={createUpdate}>
            <label>Update title<input required value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="e.g. Elevated API latency"/></label>
            <div className="form-split"><label>Audience<select value={form.audience} onChange={(event) => updateField('audience', event.target.value)}><option>Users and DBA</option><option>Users</option><option>DBA team</option><option>Internal operations</option></select></label><label>Severity<select value={form.severity} onChange={(event) => updateField('severity', event.target.value)}><option value="C">Critical</option><option value="E">High</option><option value="W">Warning</option><option value="I">Informational</option></select></label></div>
            <label>Message<textarea required rows="5" value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="Describe the impact, what is being investigated, and when the next update is expected."/></label>
            <div className="compose-note"><span>i</span><p>This workspace stores drafts in this browser. Delivery channels can be connected when notification services are configured.</p></div>
            <button className="save-draft" type="submit">{draftSaved ? 'Draft saved' : 'Save communication draft'} <span>{draftSaved ? '✓' : '→'}</span></button>
          </form>
        </section>
        <section className="panel updates-panel"><div className="panel-heading"><div><h2>Communication drafts</h2><span className="panel-caption">Prepared updates for operational review</span></div><span className="feed-count">{updates.length}</span></div>
          {updates.length ? <div className="saved-updates">{updates.map((update) => <article className="saved-update" key={update.id}><div className="saved-update-top"><b>{update.title}</b><span>{update.state}</span></div><div className="saved-update-meta"><Severity value={update.severity}/><span>{update.audience}</span><time>{new Date(update.createdAt).toLocaleString()}</time></div><p>{update.message}</p></article>)}</div> : <div className="draft-empty"><span>✉</span><b>No communication drafts yet</b><p>Use the form above to prepare a user or DBA update.</p></div>}
        </section>
      </div>
    </div>
  </div>;
}
