'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pause, Play, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useDebounced, useLive, useNow } from '../../../lib/hooks';
import { integer, SEVERITY } from '../../../lib/format';
import { ErrorNotice, LiveDot, PageHeader, Panel } from '../../../components/ui';
import { LogDrawer, LogTable } from '../../../components/log-views';

const PAGE_SIZE = 50;
const RANGES = [
  ['15m', 'Last 15 min', 15], ['1h', 'Last hour', 60], ['6h', 'Last 6 hours', 360],
  ['24h', 'Last 24 hours', 1440], ['48h', 'Last 48 hours', 2880], ['all', 'All time', 0]
];

function LogsExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const region = params.get('region') || '';
  const service = params.get('service') || '';
  const severity = params.get('severity') || '';
  const range = params.get('range') || 'all';
  const urlText = params.get('text') || '';
  const open = params.get('open') || '';
  const page = Number(params.get('page') || 0);

  const [text, setText] = useState(urlText);
  const [live, setLive] = useState(true);
  const debouncedText = useDebounced(text, 350);
  const now = useNow(5000);

  const update = useCallback((patch) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === '' || value === null || value === undefined || (key === 'range' && value === 'all') || (key === 'page' && !value)) next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in patch) && !('open' in patch)) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => { if (debouncedText !== urlText) update({ text: debouncedText }); }, [debouncedText]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(urlText); }, [urlText]);

  const meta = useLive('/api/meta', { interval: 0 });
  const sinceMinutes = RANGES.find(([key]) => key === range)?.[2] || 0;
  const path = useMemo(() => {
    const q = new URLSearchParams({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
    if (region) q.set('region', region);
    if (service) q.set('service', service);
    if (severity) q.set('severity', severity);
    if (urlText) q.set('text', urlText);
    if (sinceMinutes) q.set('since_minutes', sinceMinutes);
    return `/api/logs?${q}`;
  }, [region, service, severity, urlText, sinceMinutes, page]);

  const { data, error, loading, refresh } = useLive(path, { interval: 3000, enabled: live || page === 0 });
  const selected = new Set(severity.split(',').filter(Boolean));
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(region || service || severity || urlText || range !== 'all');

  const toggleSeverity = (key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    update({ severity: [...next].join(',') });
  };

  return (
    <>
      <PageHeader title="Security Events" description="Every log from every region, shown in each region’s local time.">
        <LiveDot active={live} label={live ? 'Live tail' : 'Paused'} />
        <button className="btn btn-outline" onClick={() => setLive((v) => !v)}>{live ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{live ? 'Pause' : 'Resume'}</button>
      </PageHeader>
      <ErrorNotice error={error && !data ? error : null} onRetry={refresh} />

      <Panel bodyClassName="">
        <div className="space-y-3 border-b border-line/[.07] p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-mute" />
              <input className="field pl-9" placeholder="Filter by message text" value={text} onChange={(e) => setText(e.target.value)} aria-label="Filter by message text" />
            </div>
            <select className="field" value={region} onChange={(e) => update({ region: e.target.value })} aria-label="Region">
              <option value="">All regions</option>
              {(meta.data?.regions || []).map((r) => <option key={r}>{r}</option>)}
            </select>
            <select className="field" value={service} onChange={(e) => update({ service: e.target.value })} aria-label="Service">
              <option value="">All services</option>
              {(meta.data?.services || []).map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="field" value={range} onChange={(e) => update({ range: e.target.value })} aria-label="Time range">
              {RANGES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mr-1">Severity</span>
            {Object.values(SEVERITY).sort((a, b) => b.rank - a.rank).map((s) => {
              const on = selected.has(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSeverity(s.key)}
                  aria-pressed={on}
                  className={cn('h-7 rounded-full border px-3 text-xs font-medium transition-colors', on ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line/10 text-soft hover:bg-white/5')}
                >
                  {s.label}
                </button>
              );
            })}
            {filtered && (
              <button className="ml-auto inline-flex items-center gap-1 text-xs text-mute hover:text-ink" onClick={() => { setText(''); router.replace(pathname); }}>
                <X className="size-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>

        <LogTable rows={data?.rows} loading={loading} now={now} selectedId={Number(open)} onOpen={(id) => update({ open: id })} />

        <footer className="flex items-center justify-between border-t border-line/[.07] px-4 py-3 text-xs text-mute">
          <span className="num">{integer(total)} events{filtered ? ' match' : ''} · page {page + 1} of {pages}</span>
          <div className="flex gap-1.5">
            <button className="btn btn-outline h-8 px-2.5" disabled={page === 0} onClick={() => update({ page: page - 1 })}><ChevronLeft className="size-4" /> Newer</button>
            <button className="btn btn-outline h-8 px-2.5" disabled={page + 1 >= pages} onClick={() => update({ page: page + 1 })}>Older <ChevronRight className="size-4" /></button>
          </div>
        </footer>
      </Panel>

      <LogDrawer id={open} onClose={() => update({ open: '' })} onOpen={(id) => update({ open: id })} />
    </>
  );
}

export default function LogsPage() {
  return <Suspense fallback={null}><LogsExplorer /></Suspense>;
}
