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
  const dots = useMemo(() => {
    const coords = [
      [100, 58], [112, 72], [122, 82], [137, 62], [148, 85], [155, 105], [165, 67], [183, 78], [197, 88], [211, 83], [221, 72], [239, 84], [250, 69], [263, 95], [276, 106], [292, 84], [306, 70], [315, 98], [326, 113], [340, 87], [353, 103], [369, 116], [382, 97], [391, 128], [408, 144], [423, 134], [438, 159], [452, 143], [462, 123], [477, 139], [486, 167], [457, 190], [430, 207], [408, 198], [390, 187], [367, 168], [342, 151], [320, 143], [295, 127], [273, 112], [247, 126], [226, 111], [207, 106], [183, 124], [163, 141], [147, 159], [130, 146], [115, 126], [98, 109], [177, 165], [190, 187], [198, 211], [205, 235], [215, 253], [226, 240], [238, 218], [245, 196], [235, 174], [222, 158], [264, 182], [280, 201], [294, 226], [312, 241], [329, 254], [347, 245], [361, 225], [376, 216], [391, 236], [412, 256], [428, 243], [441, 222], [456, 208], [469, 229], [479, 251], [458, 267], [432, 278], [407, 272], [381, 257], [355, 275], [329, 286], [302, 271], [275, 257], [249, 272], [224, 283], [201, 271], [181, 248], [160, 224], [143, 199], [124, 178], [110, 158], [293, 291], [316, 304], [340, 310], [360, 296], [381, 302], [403, 316], [425, 309], [446, 301], [466, 313]
    ];
    return coords.map(([x, y], index) => ({ x, y, color: index % 17 === 0 ? 'red' : index % 11 === 0 ? 'yellow' : index % 5 === 0 ? 'blue' : 'muted' }));
  }, []);

  return <div className="map-wrap">
    <svg viewBox="0 0 560 360" role="img" aria-label="Global service activity map">
      <defs><pattern id="mapGrid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="#ffffff" strokeOpacity=".025" strokeWidth=".6"/></pattern></defs>
      <rect width="560" height="360" fill="url(#mapGrid)" />
      {dots.map((dot, index) => <circle key={index} cx={dot.x} cy={dot.y} r={dot.color === 'red' ? 2.6 : 1.7} className={`map-dot map-${dot.color}`} />)}
      {points.slice(0, 3).map((point, i) => <g key={i} transform={`translate(${[188, 315, 404][i]} ${[122, 176, 228][i]})`}><circle r="8" className="map-pulse"/><circle r="3" className="map-point"/></g>)}
    </svg>
    <div className="map-legend"><span><i className="critical-dot"/>Critical</span><span><i className="high-dot"/>High</span><span><i className="warning-dot"/>Warning</span><span><i className="low-dot"/>Info</span></div>
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
  const alertCount = data.anomalies.length + criticalCount;
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

    <section className="stat-grid">
      <article className="stat-card"><div className="stat-label">Critical events <span className="stat-icon red">!</span></div><div className="stat-value">{criticalCount}</div><div className="stat-foot"><span className="trend red-text">{status === 'online' ? '● Live' : '—'}</span><span>in current log window</span></div><div className="sparkline red-line"/></article>
      <article className="stat-card"><div className="stat-label">Anomaly alerts <span className="stat-icon amber">⌁</span></div><div className="stat-value">{alertCount}</div><div className="stat-foot"><span className="trend amber-text">{data.anomalies.length} detected</span><span>from hourly baseline</span></div><div className="sparkline amber-line"/></article>
      <article className="stat-card"><div className="stat-label">Events in 24h <span className="stat-icon blue">↗</span></div><div className="stat-value">{totalEvents.toLocaleString()}</div><div className="stat-foot"><span className="trend blue-text">{data.regionErrors.length} regions</span><span>error and critical</span></div><div className="sparkline blue-line"/></article>
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
        <Panel title="Global activity" action={<span className="panel-caption">Service signals by region</span>}>
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
