"use client";

import { useState } from 'react';
import Link from 'next/link';
import { getJson } from '../../lib/api';

function Severity({ value }) {
  const labels = { C: 'Critical', E: 'High', W: 'Warning', I: 'Info' };
  const tone = value === 'C' ? 'critical' : value === 'E' ? 'high' : value === 'W' ? 'warning' : 'info';
  return <span className={`severity severity-${tone}`}>{labels[value] || value}</span>;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(event) {
    event?.preventDefault();
    if (query.trim().length < 2) { setError('Enter at least two characters to search.'); return; }
    setLoading(true); setError(''); setSearched(true);
    try {
      const data = await getJson(`/api/logs/search?q=${encodeURIComponent(query.trim())}`);
      setResults(data.results || []);
    } catch (err) { setResults([]); setError(err.message || 'Search is unavailable. Check the backend connection.'); }
    finally { setLoading(false); }
  }

  return <div className="security-dashboard">
    <div className="dashboard-title"><div><div className="eyebrow">INCIDENT INVESTIGATION</div><h1>Threat search</h1><p>Find events with similar meaning using semantic search.</p></div><Link href="/logs" className="panel-link">Browse all events →</Link></div>
    <section className="panel search-panel"><div className="panel-heading"><h2>Search event messages</h2><span className="panel-caption">Oracle vector search</span></div><form className="search-form" onSubmit={runSearch}><span className="search-symbol">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe an incident, e.g. database connection timeout" aria-label="Search event messages"/><button className="apply-button" disabled={loading}>{loading ? 'Searching…' : 'Search events'}</button></form><p className="search-hint">Results are ranked by semantic similarity to the query.</p></section>
    {error && <div className="connection-notice"><span>{error}</span><Link href="/">Overview</Link></div>}
    <section className="panel results-panel"><div className="panel-heading"><h2>Matching events</h2><span className="panel-caption">{loading ? 'Searching…' : searched ? `${results.length} results` : 'Enter a search above'}</span></div>
      {results.length ? <div className="search-results">{results.map((row) => <article className="result-card" key={row.LOG_ID || row.log_id}><div className="result-main"><div className="result-message">{row.MESSAGE || row.message}</div><div className="result-meta"><Link href={`/logs/${encodeURIComponent(row.SERVICE_NAME || row.service_name)}`}>{row.SERVICE_NAME || row.service_name}</Link><span>·</span><span>{row.REGION_NAME || row.region_name}</span><span>·</span><span>{row.LOCAL_LOG_TIME || row.local_log_time}</span></div></div><div className="result-side"><Severity value={row.SEVERITY || row.severity}/><span className="similarity">{(Number(row.SIMILARITY ?? row.similarity ?? 0) * 100).toFixed(1)}% match</span></div></article>)}</div> : <div className="empty-state"><span className="empty-search">⌕</span><b>{searched ? 'No matching events' : 'Search your event history'}</b><p>{searched ? 'Try a broader phrase or review the event log.' : 'Use plain language to find related incidents and messages.'}</p></div>}
    </section>
    <style jsx>{`
      .search-panel { margin-bottom:18px; }.search-form { display:flex; align-items:center; gap:12px; padding:20px 20px 8px; }.search-symbol { color:#829bc8; font-size:27px; line-height:1; }.search-form input { flex:1; min-width:0; height:48px; border:1px solid #343a3e; border-radius:6px; background:#0e1011; color:#e5e7e8; padding:0 14px; font-size:14px; }.search-form input::placeholder { color:#747c82; }.search-hint { padding:0 20px 16px 58px; margin:0; color:#858d92; font-size:12px; }.apply-button { height:48px; border:1px solid #31518b; background:#1a3159; color:#c3d4f4; border-radius:6px; padding:0 18px; cursor:pointer; font-size:13px; white-space:nowrap; }.apply-button:hover { background:#234071; }.apply-button:disabled { opacity:.55; cursor:wait; }.search-results { padding:8px 18px; }.result-card { min-height:82px; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:15px 5px; border-bottom:1px solid #25292b; }.result-card:last-child { border-bottom:0; }.result-main { min-width:0; }.result-message { color:#e0e2e3; font-size:14px; overflow-wrap:anywhere; }.result-meta { display:flex; gap:9px; flex-wrap:wrap; margin-top:9px; color:#969da2; font-size:11px; }.result-meta a { color:#b6c8ea; }.result-side { display:flex; flex-direction:column; align-items:flex-end; gap:8px; white-space:nowrap; }.similarity { color:#92999e; font-size:11px; }.empty-state { min-height:240px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px; }.empty-search { color:#7894c5; font-size:32px; margin-bottom:10px; }.empty-state b { color:#d9dcde; font-size:15px; font-weight:600; }.empty-state p { color:#92999e; font-size:13px; margin:8px 0 0; }
      @media(max-width:580px) { .search-form { flex-wrap:wrap; }.search-form input { flex-basis:calc(100% - 40px); }.search-form button { width:100%; }.result-card { align-items:flex-start; }.result-side { align-items:flex-end; } }
    `}</style>
  </div>;
}
