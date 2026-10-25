"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getJson } from '../../lib/api';

const initialFilters = { region: '', service: '', severity: '', from: '', to: '' };

function Severity({ value }) {
  const labels = { C: 'Critical', E: 'High', W: 'Warning', I: 'Info' };
  const tone = value === 'C' ? 'critical' : value === 'E' ? 'high' : value === 'W' ? 'warning' : 'info';
  return <span className={`severity severity-${tone}`}>{labels[value] || value || 'Unknown'}</span>;
}

export default function LogsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLogs(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (!value) return;
        params.set(key, key === 'from' || key === 'to' ? new Date(value).toISOString() : value);
      });
      const data = await getJson(`/api/logs${params.size ? `?${params}` : ''}`);
      setRows(data.rows || []);
    } catch (err) {
      setRows([]);
      setError(err.message || 'Could not load events. Check the backend connection.');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadLogs(initialFilters); }, []);
  function update(key, value) { setFilters((current) => ({ ...current, [key]: value })); }

  return <div className="security-dashboard">
    <div className="dashboard-title"><div><div className="eyebrow">EVENT INVESTIGATION</div><h1>Security events</h1><p>Filter, review, and inspect events from monitored services.</p></div><button className="refresh-button" onClick={() => loadLogs()} disabled={loading}>↻ <span>{loading ? 'Loading' : 'Refresh events'}</span></button></div>
    {error && <div className="connection-notice"><span>{error}</span><Link href="/">Back to overview</Link></div>}
    <section className="panel filter-panel"><div className="panel-heading"><h2>Filters</h2><button className="clear-button" onClick={() => { setFilters(initialFilters); loadLogs(initialFilters); }}>Clear all</button></div><form className="filter-form" onSubmit={(event) => { event.preventDefault(); loadLogs(); }}>
      <label>Region<input value={filters.region} onChange={(e) => update('region', e.target.value)} placeholder="e.g. US, EU"/></label>
      <label>Service<input value={filters.service} onChange={(e) => update('service', e.target.value)} placeholder="Service name"/></label>
      <label>Severity<select value={filters.severity} onChange={(e) => update('severity', e.target.value)}><option value="">All severities</option><option value="C">Critical</option><option value="E">High</option><option value="W">Warning</option><option value="I">Info</option></select></label>
      <label>From<input type="datetime-local" value={filters.from} onChange={(e) => update('from', e.target.value)}/></label>
      <label>To<input type="datetime-local" value={filters.to} onChange={(e) => update('to', e.target.value)}/></label>
      <button className="apply-button" disabled={loading}>{loading ? 'Applying…' : 'Apply filters'}</button>
    </form></section>
    <section className="panel log-results"><div className="panel-heading"><h2>Event log</h2><span className="panel-caption">{loading ? 'Loading events…' : `${rows.length} ${rows.length === 1 ? 'event' : 'events'} · latest 250`}</span></div><div className="table-scroll"><table className="data-table log-table"><thead><tr><th>Time</th><th>Service</th><th>Region</th><th>Severity</th><th>Message</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.LOG_ID || row.log_id}><td className="time-cell">{row.LOCAL_LOG_TIME || row.local_log_time}</td><td><Link href={`/logs/${encodeURIComponent(row.SERVICE_NAME || row.service_name)}`}>{row.SERVICE_NAME || row.service_name}</Link></td><td>{row.REGION_NAME || row.region_name}</td><td><Severity value={row.SEVERITY || row.severity}/></td><td className="event-name">{row.MESSAGE || row.message}</td></tr>)}
      {!loading && !rows.length && <tr><td colSpan="5" className="empty-row">{error ? 'Events are unavailable until the backend reconnects.' : 'No events match these filters.'}</td></tr>}
    </tbody></table></div></section>
    <style jsx>{`
      .filter-panel { margin-bottom:14px; }
      .filter-form { padding:14px; display:grid; grid-template-columns:repeat(5,minmax(110px,1fr)) auto; gap:9px; align-items:end; }
      .filter-form label { display:flex; flex-direction:column; gap:8px; color:#a7adb1; font-size:12px; }
      .filter-form input,.filter-form select { height:42px; min-width:0; border:1px solid #303538; background:#0e1011; color:#d9dcde; border-radius:6px; padding:0 11px; font-size:13px; }
      .apply-button,.clear-button { border:1px solid #31518b; background:#1a3159; color:#c3d4f4; border-radius:6px; height:42px; padding:0 16px; cursor:pointer; font-size:13px; }
      .apply-button:hover { background:#234071; }.apply-button:disabled { opacity:.55; cursor:wait; }
      .clear-button { border-color:#303538; background:transparent; color:#aeb4b8; height:34px; font-size:12px; }.clear-button:hover { color:#e0e2e3; background:#ffffff08; }
      .log-results { min-height:230px; }
      @media(max-width:900px) { .filter-form { grid-template-columns:repeat(3,minmax(110px,1fr)); }.filter-form button { grid-column:span 1; } }
      @media(max-width:580px) { .filter-form { grid-template-columns:repeat(2,minmax(0,1fr)); }.filter-form label { min-width:0; }.filter-form button { width:100%; } }
    `}</style>
  </div>;
}
