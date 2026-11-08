'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Gauge, ShieldAlert, Siren } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLive, useNow } from '../../../lib/hooks';
import { compact, integer, percentChange, relativeTime, tzAbbrev } from '../../../lib/format';
import { EmptyState, ErrorNotice, LiveDot, PageHeader, Panel, SeverityBadge, Skeleton } from '../../../components/ui';
import { WorldMap } from '../../../components/world-map';
import { TrendChart } from '../../../components/trend-chart';

function Kpi({ href, label, value, icon: Icon, tone, delta, foot, loading }) {
  const toneText = { crit: 'text-crit', err: 'text-err', warn: 'text-warn', info: 'text-info', brand: 'text-brand' }[tone];
  const up = delta > 0;
  return (
    <Link href={href} className="card group block p-4 transition-colors hover:bg-raised">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <Icon className={cn('size-4', toneText)} strokeWidth={1.8} />
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="num mt-2 text-[28px] font-semibold leading-none tracking-tight">{value}</p>}
      <div className="mt-3 flex items-center gap-2 text-xs text-mute">
        {delta !== null && delta !== undefined && !loading && (
          <span className={cn('inline-flex items-center gap-0.5 font-medium', up ? 'text-err' : 'text-brand')}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(delta)}%
          </span>
        )}
        <span>{foot}</span>
      </div>
    </Link>
  );
}

function AnomalyPanel({ anomalies, loading }) {
  return (
    <Panel
      title="Anomaly detection"
      description="Latest hour vs. a 24-hour baseline (mean + 3σ)"
      action={<span className="num rounded-md bg-white/5 px-2 py-0.5 text-xs text-soft">{anomalies.length} active</span>}
      bodyClassName="p-2"
    >
      {loading ? (
        <div className="space-y-2 p-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : anomalies.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No anomalies right now" body="Every service is within its normal error range." />
      ) : (
        <ul className="space-y-1">
          {anomalies.map((a) => (
            <li key={`${a.service_id}-${a.hour_start_utc}`}>
              <Link href={`/logs/${encodeURIComponent(a.service_name)}`} className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/[.04]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-crit/12 text-crit"><AlertTriangle className="size-4" strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{a.service_name} <span className="font-normal text-mute">· {a.region_name}</span></span>
                  <span className="mt-0.5 block text-xs text-mute">
                    <span className="num text-soft">{a.error_count}</span> errors/h vs baseline <span className="num">{Number(a.baseline_avg).toFixed(1)}</span> · <span className="num text-crit">{Number(a.score).toFixed(1)}σ</span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-mute opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LiveFeed({ rows, now }) {
  return (
    <Panel
      title="Live event stream"
      description="Newest events across all regions"
      action={<LiveDot />}
      bodyClassName="overflow-hidden"
    >
      {!rows ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Gauge} title="Waiting for events" body="Start the simulator (npm run simulate) or POST to /api/logs/ingest." />
      ) : (
        <ul className="divide-y divide-line/[.06]">
          {rows.map((row) => (
            <li key={row.log_id} className="animate-rowIn">
              <Link href={`/logs?open=${row.log_id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-white/[.03]">
                <SeverityBadge value={row.severity} className="w-[74px] shrink-0 justify-start" />
                <span className="min-w-0 flex-1 truncate">{row.message}</span>
                <span className="hidden shrink-0 font-mono text-xs text-mute sm:block">{row.service_name}</span>
                <span className="hidden w-14 shrink-0 text-xs text-mute md:block">{row.region_name}</span>
                <span className="num w-16 shrink-0 text-right text-xs text-mute">{relativeTime(row.utc_time, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function OverviewPage() {
  const summary = useLive('/api/dashboard/summary', { interval: 6000 });
  const feed = useLive('/api/logs?limit=9', { interval: 3000 });
  const now = useNow(1000);

  const d = summary.data;
  const loading = summary.loading && !d;
  const k = d?.kpis;
  const errorDelta = k ? percentChange(k.errors24h, k.errorsPrev24h) : null;
  const critDelta = k ? percentChange(k.critical24h, k.criticalPrev24h) : null;
  const maxErrors = useMemo(() => Math.max(1, ...(d?.services || []).map((s) => Number(s.error_count))), [d]);

  return (
    <>
      <PageHeader title="Overview" description="Health of every service in every region, refreshed live.">
        <LiveDot />
        {summary.updatedAt && <span className="text-xs text-mute">Updated {relativeTime(new Date(summary.updatedAt).toISOString(), now)}</span>}
      </PageHeader>
      <ErrorNotice error={summary.error && !d ? summary.error : null} onRetry={summary.refresh} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi href="/logs?severity=C&range=24h" label="Critical · 24h" icon={Siren} tone="crit" loading={loading} value={integer(k?.critical24h)} delta={critDelta} foot="vs previous 24h" />
        <Kpi href="/logs?severity=E,C&range=24h" label="Errors · 24h" icon={ShieldAlert} tone="err" loading={loading} value={integer(k?.errors24h)} delta={errorDelta} foot={`${integer(k?.errors1h)} in last hour`} />
        <Kpi href="/incidents" label="Active anomalies" icon={AlertTriangle} tone="warn" loading={loading} value={integer(k?.anomalyCount)} foot={k?.anomalyCount ? 'Investigate now' : 'All normal'} />
        <Kpi href="/logs" label="Ingest · 5 min" icon={Gauge} tone="brand" loading={loading} value={compact(k?.events5m)} foot={`${compact(k?.events24h)} events / 24h`} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Regional error map" description="Marker size reflects 24-hour errors. Click a region to drill in." bodyClassName="p-3">
          {loading ? <Skeleton className="aspect-[2/1] w-full" /> : <WorldMap regions={d?.regionErrors || []} />}
        </Panel>
        <Panel title="Regions" description="Errors in the last 24 hours" bodyClassName="p-2">
          <ul className="space-y-0.5">
            {(d?.regionErrors || []).slice().sort((a, b) => b.error_count - a.error_count).map((r) => (
              <li key={r.region_name}>
                <Link href={`/logs?region=${r.region_name}`} className="group block rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.04]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-medium">{r.label} <span className="text-xs font-normal text-mute">{r.city}</span></span>
                    <span className="num text-sm font-semibold">{integer(r.error_count)}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.06]">
                    <div className="h-full rounded-full bg-err" style={{ width: `${Math.min(100, (r.error_count / Math.max(1, ...d.regionErrors.map((x) => x.error_count))) * 100)}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-mute">
                    <span>{integer(r.critical_count)} critical</span><span>{tzAbbrev(r.region_tz)} · {integer(r.errors_1h)} last hour</span>
                  </div>
                </Link>
              </li>
            ))}
            {loading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="m-2 h-14" />)}
          </ul>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Hourly trend"
          description="Warnings, errors and critical events, last 24 hours (UTC hours shown in your local time)"
          action={<div className="hidden items-center gap-3 text-xs text-mute sm:flex">{[['Critical', 'bg-crit'], ['Error', 'bg-err'], ['Warning', 'bg-warn']].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className={cn('size-2 rounded-sm', c)} />{l}</span>)}</div>}
        >
          {loading ? <Skeleton className="m-4 h-[220px]" /> : <TrendChart data={d?.hourlyTrend} />}
        </Panel>
        <AnomalyPanel anomalies={d?.anomalies || []} loading={loading} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <LiveFeed rows={feed.data?.rows} now={now} />
        <Panel title="Service health" description="24-hour errors by service, across all regions" bodyClassName="p-2">
          <ul className="space-y-0.5">
            {(d?.services || []).map((s) => (
              <li key={s.service_name}>
                <Link href={`/logs/${encodeURIComponent(s.service_name)}`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.04]">
                  <span className="w-40 shrink-0 truncate font-mono text-[13px]">{s.service_name}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-warn to-crit" style={{ width: `${(Number(s.error_count) / maxErrors) * 100}%` }} />
                  </span>
                  <span className="num w-10 text-right text-[13px] font-medium">{s.error_count}</span>
                  <span className="num hidden w-20 text-right text-xs text-mute sm:block">{s.errors_1h} / hr</span>
                </Link>
              </li>
            ))}
            {loading && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="m-2 h-9" />)}
          </ul>
        </Panel>
      </div>
    </>
  );
}
