"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getJson } from '../../../lib/api';

function Severity({ value }) {
  const labels = { C: 'Critical', E: 'High', W: 'Warning', I: 'Info' };
  const tone = value === 'C' ? 'critical' : value === 'E' ? 'high' : value === 'W' ? 'warning' : 'info';
  return <span className={`severity severity-${tone}`}>{labels[value] || value}</span>;
}

export default function ServiceDetailPage() {
  const { service } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!service) return;
    getJson(`/api/logs/service/${encodeURIComponent(service)}`).then(setData).catch((err) => { setError(err.message || 'Could not load service events.'); setData({ service, rows: [] }); });
  }, [service]);

  if (!data) return <div className="security-dashboard"><div className="empty-row">Loading service events…</div></div>;
  return <div className="security-dashboard">
    <div className="dashboard-title"><div><div className="eyebrow">SERVICE INVESTIGATION</div><h1>{data.service}</h1><p>Recent events associated with this service.</p></div><Link href="/logs" className="panel-link">← All events</Link></div>
    {error && <div className="connection-notice"><span>{error}</span><Link href="/">Overview</Link></div>}
    <section className="panel"><div className="panel-heading"><h2>Service event history</h2><span className="panel-caption">{data.rows.length} events · latest 500</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Time</th><th>Region</th><th>Severity</th><th>User impact</th><th>Message</th><th>Payload</th></tr></thead><tbody>
      {data.rows.map((row) => <tr key={row.LOG_ID || row.log_id}><td className="time-cell">{row.LOCAL_LOG_TIME || row.local_log_time}</td><td>{row.REGION_NAME || row.region_name}</td><td><Severity value={row.SEVERITY || row.severity}/></td><td>{row.USER_IMPACT || row.user_impact || '—'}</td><td className="event-name">{row.MESSAGE || row.message}</td><td><details><summary>Inspect</summary><pre>{JSON.stringify(row.PAYLOAD || row.payload || {}, null, 2)}</pre></details></td></tr>)}
      {!data.rows.length && <tr><td colSpan="6" className="empty-row">{error ? 'Service events are unavailable until the backend reconnects.' : 'No events recorded for this service.'}</td></tr>}
    </tbody></table></div></section>
    <style jsx>{`details { position:relative; color:#9aadd0; font-size:9px; cursor:pointer; } summary { list-style:none; } summary::-webkit-details-marker { display:none; } pre { position:absolute; z-index:2; right:0; top:14px; min-width:230px; max-width:360px; max-height:250px; overflow:auto; padding:10px; border:1px solid #343a40; border-radius:4px; background:#101213; color:#c4c9cc; font-size:9px; white-space:pre-wrap; box-shadow:0 8px 24px #0009; }`}</style>
  </div>;
}
