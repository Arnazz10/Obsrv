'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getJson } from '../../../lib/api';
import { relativeTime, SEVERITY, tzAbbrev } from '../../../lib/format';
import { EmptyState, PageHeader, Panel, SeverityBadge } from '../../../components/ui';

const EXAMPLES = ['database is down', 'users cannot log in', 'payments failing', 'slow responses', 'checkout broken', 'cache problems'];

function Results({ data, now }) {
  const best = data.results[0]?.similarity || 1;
  return (
    <ul className="divide-y divide-line/[.06]">
      {data.results.map((r) => {
        const pct = Math.round((r.similarity / Math.max(best, 0.0001)) * 100);
        return (
          <li key={r.log_id} className="group px-5 py-4 transition-colors hover:bg-white/[.025]">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={r.severity} />
                  <p className="text-[14px] font-medium">{r.message}</p>
                </div>
                <p className="mt-1.5 text-[13px] text-mute">
                  <span className="num text-soft">{r.occurrences}</span> occurrences across <span className="num text-soft">{r.service_count}</span> service{r.service_count > 1 ? 's' : ''} and <span className="num text-soft">{r.region_count}</span> region{r.region_count > 1 ? 's' : ''}
                </p>
                <p className="mt-0.5 text-xs text-mute">
                  Latest: <span className="font-mono">{r.service_name}</span> · {r.region_name} · {r.local_log_time} {tzAbbrev(r.region_tz)} ({relativeTime(r.utc_time, now)})
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/logs?open=${r.log_id}`} className="btn btn-outline h-8 text-xs">Open latest event</Link>
                  <Link href={`/logs?text=${encodeURIComponent(r.message)}&severity=${r.severity}`} className="btn btn-ghost h-8 text-xs">All matching events <ArrowRight className="size-3.5" /></Link>
                </div>
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="num text-lg font-semibold leading-none">{Math.round(r.similarity * 100)}%</p>
                <p className="mt-1 text-[11px] text-mute">similarity</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ThreatSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const urlQuery = params.get('q') || '';
  const severity = params.get('severity') || '';

  const [input, setInput] = useState(urlQuery);
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [now, setNow] = useState(() => Date.now());
  const token = useRef(0);

  const run = useCallback(async (q, sev) => {
    const id = ++token.current;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await getJson(`/api/logs/search?q=${encodeURIComponent(q)}&limit=12${sev ? `&severity=${sev}` : ''}`);
      if (id === token.current) { setNow(Date.now()); setState({ status: 'done', data, error: null }); }
    } catch (error) {
      if (id === token.current) setState({ status: 'error', data: null, error });
    }
  }, []);

  useEffect(() => {
    setInput(urlQuery);
    if (urlQuery.trim().length >= 2) run(urlQuery.trim(), severity);
    else setState({ status: 'idle', data: null, error: null });
  }, [urlQuery, severity, run]);

  const go = (q, sev = severity) => {
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (sev) next.set('severity', sev);
    router.push(`/search?${next}`);
  };

  return (
    <>
      <PageHeader title="Threat Search" description="Describe a problem in plain language. Oracle vector search ranks related errors by meaning, not keywords." />

      <form onSubmit={(e) => { e.preventDefault(); if (input.trim().length >= 2) go(input); }} className="card p-4">
        <div className="relative">
          <Sparkles className="pointer-events-none absolute left-4 top-3.5 size-5 text-brand" strokeWidth={1.6} />
          <input
            className="field h-12 pl-12 pr-28 text-[15px]"
            placeholder="e.g. customers can’t complete a purchase"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Describe the problem"
            autoFocus
          />
          <button type="submit" className="btn btn-solid absolute right-1.5 top-1.5" disabled={input.trim().length < 2 || state.status === 'loading'}>
            {state.status === 'loading' ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label mr-1">Try</span>
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} onClick={() => { setInput(ex); go(ex); }} className="h-7 rounded-full border border-line/10 px-3 text-xs text-soft transition-colors hover:bg-white/5 hover:text-ink">{ex}</button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
          <label className="flex items-center gap-2 text-xs text-mute">
            Severity
            <select className="field h-7 w-auto py-0 text-xs" value={severity} onChange={(e) => go(urlQuery || input, e.target.value)} aria-label="Severity filter">
              <option value="">Any</option>
              {Object.values(SEVERITY).sort((a, b) => b.rank - a.rank).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </form>

      <div className="mt-4">
        {state.status === 'idle' && (
          <Panel><EmptyState icon={Sparkles} title="Search by meaning" body="Type what you’re seeing — “database is down” also finds “DB connection refused” and “primary unreachable”." /></Panel>
        )}
        {state.status === 'loading' && !state.data && (
          <Panel><div className="flex items-center justify-center gap-2 py-16 text-sm text-mute"><Loader2 className="size-4 animate-spin" /> Ranking events by vector distance…</div></Panel>
        )}
        {state.status === 'error' && (
          <Panel><EmptyState icon={Search} title="Search failed" body={state.error.message} action={<button className="btn btn-outline" onClick={() => run(urlQuery, severity)}>Try again</button>} /></Panel>
        )}
        {state.status === 'done' && (
          <Panel
            title={`${state.data.results.length} related issues`}
            description={`Ranked by cosine similarity to “${state.data.query}”`}
            className={cn(state.status === 'loading' && 'opacity-60')}
          >
            {state.data.results.length ? <Results data={state.data} now={now} /> : <EmptyState icon={Search} title="Nothing related yet" body="No events have been ingested. Run the seeder or the simulator first." />}
          </Panel>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return <Suspense fallback={null}><ThreatSearch /></Suspense>;
}
