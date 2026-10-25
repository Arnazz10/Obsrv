"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getJson } from '../lib/api';

const emptySummary = { regionErrors: [], topServices: [], hourlyTrend: [], anomalies: [] };

function severityLabel(value) {
  return ({ C: 'Critical', E: 'High', W: 'Warning', I: 'Info' })[value] || value || 'Unknown';
}

function Severity({ value }) {
  const tone = value === 'C' ? 'critical' : value === 'E' ? 'high' : value === 'W' ? 'warning' : 'info';
  return <span className={`severity severity-${tone}`}>{severityLabel(value)}</span>;
}

function Panel({ title, action, children, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}

function WorldMap({ points }) {
  const regionPositions = { us: [170, 142], eu: [402, 117], india: [526, 186], japan: [636, 150] };
  const markers = points.map((point) => {
    const name = String(point.REGION_NAME || point.region_name || '').toLowerCase();
    const position = regionPositions[name];
    return position ? {
      name: point.REGION_NAME || point.region_name,
      count: Number(point.ERROR_COUNT || point.error_count || 0),
      x: position[0],
      y: position[1]
    } : null;
  }).filter(Boolean);
  return <div className="map-wrap">
    <svg viewBox="0 0 800 370" role="img" aria-label="Regional error activity map">
      <g className="map-land">
        <path d="M66 82 102 56 151 49 182 62 211 57 237 74 229 91 198 96 183 116 158 124 151 151 133 169 117 157 111 134 89 119 79 101Z"/>
        <path d="M176 178 198 171 219 184 224 211 216 235 207 262 193 290 181 317 169 298 173 272 160 248 157 222 165 199Z"/>
        <path d="M330 82 359 67 392 69 411 81 437 75 465 84 492 78 527 88 557 82 587 95 624 90 661 104 697 108 720 126 699 140 668 138 648 151 623 145 603 162 579 159 566 181 545 174 529 154 504 151 491 133 468 140 447 128 427 137 405 127 385 139 368 123 348 115Z"/>
        <path d="M383 151 410 143 438 155 451 179 445 203 431 224 422 252 407 274 392 260 389 236 377 215 372 191Z"/>
        <path d="M637 223 665 213 693 222 709 240 696 256 673 259 654 248Z"/>
        <path d="M285 120 298 115 308 122 303 135 291 136Z"/>
        <path d="M728 176 736 172 741 181 736 188Z"/>
      </g>
      <g className="map-graticule"><path d="M40 185H760M400 36V330M40 110H760M40 260H760"/></g>
      {markers.map((marker) => <g key={marker.name} className="map-marker" transform={`translate(${marker.x} ${marker.y})`}>
        <circle r={Math.min(19, 7 + Math.sqrt(marker.count))} className="map-marker-halo"/>
        <circle r="5" className="map-marker-core"/>
        <text x="10" y="-9">{marker.name} · {marker.count.toLocaleString()}</text>
        <title>{marker.name}: {marker.count.toLocaleString()} errors in the last 24 hours</title>
      </g>)}
      {markers.length === 0 && <text x="400" y="190" textAnchor="middle" className="map-empty">No regional error activity in the last 24 hours</text>}
    </svg>
    <div className="map-legend"><span><i className="critical-dot"/>Circle size shows error volume · last 24 hours</span></div>
  </div>;
}

export default function DashboardPage() {
  const [data, setData] = useState(emptySummary);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('checking');
  const [checkedAt, setCheckedAt] = useState(null);
  const [error, setError] = useState('');

  async function refresh() {
    setStatus('checking');
    setError('');
    try {
      const [summary, logResult, health] = await Promise.all([
        getJson('/api/dashboard/summary'), getJson('/api/logs'), getJson('/health')
      ]);
      setData(summary);
      setLogs(logResult.rows || []);
      setStatus(health.ok ? 'online' : 'degraded');
      setCheckedAt(new Date());
    } catch (err) {
      setStatus('offline');
      setError(err.message || 'Could not reach the observability API');
      setData(emptySummary);
      setLogs([]);
      setCheckedAt(new Date());
    }
  }

  useEffect(() => { refresh(); }, []);

  const criticalCount = logs.filter((row) => (row.SEVERITY || row.severity) === 'C').length;
  const alertCount = data.anomalies.length;
  const totalEvents = data.regionErrors.reduce((sum, row) => sum + Number(row.ERROR_COUNT || row.error_count || 0), 0);
  const topSources = useMemo(() => {
    const counts = new Map();
    logs.forEach((row) => {
      const message = row.MESSAGE || row.message || 'Unknown source';
      counts.set(message, (counts.get(message) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [logs]);

  return <div className="security-dashboard">
    <div className="dashboard-title"><div><div className="eyebrow">SECURITY OPERATIONS</div><h1>Overview</h1><p>Live signals across your monitored services</p></div><div className="updated">{checkedAt ? `Updated ${checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting…'}</div></div>
    {error && <div className="connection-notice"><span>API unavailable · {error}</span><Link href="/logs">Open logs</Link></div>}
    {!error && status === 'online' && logs.length === 0 && <div className="connection-notice info" role="status"><span>Oracle is connected, but no events have been ingested yet. Dashboard totals reflect stored events.</span><a href="https://github.com/Arnazz10/Obsrv#6-start-the-log-generator" target="_blank" rel="noreferrer">Ingestion setup →</a></div>}

    <section className="stat-grid">
      <article className="stat-card"><div className="stat-label">Critical events <span className="stat-icon red">!</span></div><div className="stat-value">{criticalCount}</div><div className="stat-foot"><span className="trend red-text">{status === 'online' ? 'Live' : '—'}</span><span>in the latest 250 log records</span></div></article>
      <article className="stat-card"><div className="stat-label">Anomaly alerts <span className="stat-icon amber">⌁</span></div><div className="stat-value">{alertCount}</div><div className="stat-foot"><span className="trend amber-text">{data.anomalies.length} detected</span><span>from hourly baseline</span></div></article>
      <article className="stat-card"><div className="stat-label">Errors in 24h <span className="stat-icon blue">↗</span></div><div className="stat-value">{totalEvents.toLocaleString()}</div><div className="stat-foot"><span className="trend blue-text">{data.regionErrors.length} regions</span><span>high and critical severity</span></div></article>
      <article className="stat-card status-card"><div className="stat-label">System status <span className={`status-dot ${status}`}/></div><div className="stat-value status-value">{status === 'online' ? 'Operational' : status === 'checking' ? 'Connecting' : 'Unavailable'}</div><div className="stat-foot"><span className="muted">{status === 'online' ? 'API and database responding' : 'Check backend and database configuration'}</span></div></article>
    </section>

    <div className="dashboard-grid">
      <div className="primary-column">
        <Panel title="Recent security events" action={<Link className="panel-link" href="/logs">View all events <span>→</span></Link>}>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Event</th><th>Service</th><th>Region</th><th>Severity</th><th>Time</th></tr></thead><tbody>
            {logs.slice(0, 6).map((row) => <tr key={row.LOG_ID || row.log_id}><td className="event-name">{row.MESSAGE || row.message}</td><td><Link href={`/logs/${encodeURIComponent(row.SERVICE_NAME || row.service_name)}`}>{row.SERVICE_NAME || row.service_name}</Link></td><td>{row.REGION_NAME || row.region_name}</td><td><Severity value={row.SEVERITY || row.severity}/></td><td className="time-cell">{row.LOCAL_LOG_TIME || row.local_log_time}</td></tr>)}
            {logs.length === 0 && <tr><td colSpan="5" className="empty-row">{status === 'checking' ? 'Connecting to the log service…' : 'No events returned by the backend.'}</td></tr>}
          </tbody></table></div>
        </Panel>
        <Panel title="Regional error activity" action={<span className="panel-caption">Last 24 hours</span>}>
          <WorldMap points={data.regionErrors}/>
        </Panel>
        <Panel title="Hourly error trend" action={<span className="panel-caption">Last 24 hours · UTC</span>}>
          <div className="trend-chart" aria-label="Hourly error counts">
            {data.hourlyTrend.length ? data.hourlyTrend.map((point) => {
              const value = Number(point.ERROR_COUNT || point.error_count || 0);
              const max = Math.max(1, ...data.hourlyTrend.map((p) => Number(p.ERROR_COUNT || p.error_count || 0)));
              return <div className="trend-column" key={point.HOUR_LABEL || point.hour_label} title={`${point.HOUR_LABEL || point.hour_label}: ${value} events`}><span style={{ height: `${Math.max(5, value / max * 100)}%` }}/><small>{(point.HOUR_LABEL || point.hour_label || '').slice(11, 16)}</small></div>;
            }) : <div className="chart-empty">Hourly data will appear when the database has recorded events.</div>}
          </div>
        </Panel>
      </div>
      <aside className="side-column">
        <Panel title="Anomaly detection" action={<button className="refresh-button" onClick={refresh} disabled={status === 'checking'}>↻ <span>Refresh</span></button>}>
          <div className="alert-list">{data.anomalies.length ? data.anomalies.slice(0, 5).map((item, index) => <article className="alert-item" key={`${item.SERVICE_NAME || item.service_name}-${index}`}><div className="alert-item-top"><span className="alert-indicator"/><span className="alert-title">Unusual error volume</span><span className="alert-chevron">›</span></div><div className="alert-meta">{item.SERVICE_NAME || item.service_name} · {item.REGION_NAME || item.region_name}</div><div className="alert-description">{item.ERROR_COUNT || item.error_count} errors in the latest hourly window</div><div className="alert-bottom"><Severity value="E"/><span>{item.HOUR_START_UTC || item.hour_start_utc}</span></div></article>) : <div className="side-empty">{status === 'online' ? 'No anomalies detected in the latest hourly window.' : 'Anomaly results appear when the API is connected.'}</div>}</div>
        </Panel>
        <Panel title="Most active regions" action={<Link href="/logs" className="text-link">Logs →</Link>}>
          <div className="region-list">{data.regionErrors.length ? data.regionErrors.slice(0, 5).map((row) => <div className="region-row" key={row.REGION_ID || row.region_id || row.REGION_NAME || row.region_name}><span className="region-marker">◉</span><span className="region-name">{row.REGION_NAME || row.region_name}</span><span className="region-count">{Number(row.ERROR_COUNT || row.error_count || 0).toLocaleString()}<small> events</small></span></div>) : <div className="side-empty">No region activity in the last 24 hours.</div>}</div>
        </Panel>
        <Panel title="Top event messages" action={<span className="panel-caption">Current log window</span>}>
          <div className="source-list">{topSources.length ? topSources.map(([message, count]) => <div className="source-row" key={message}><span title={message}>{message}</span><b>{count}</b></div>) : <div className="side-empty">No messages to summarize.</div>}</div>
        </Panel>
        <Panel title="Quick access"><div className="quick-links"><Link href="/logs"><span className="quick-icon">≡</span><span><b>Browse logs</b><small>Filter and inspect events</small></span><i>→</i></Link><Link href="/search"><span className="quick-icon">⌕</span><span><b>Semantic search</b><small>Find related incidents</small></span><i>→</i></Link></div></Panel>
      </aside>
    </div>
  </div>;
}
