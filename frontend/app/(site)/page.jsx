'use client';

import Link from 'next/link';
import { ArrowRight, Braces, DatabaseZap, Globe2, LineChart, Radar, Sparkles } from 'lucide-react';
import { useLive } from '../../lib/hooks';
import { compact, integer } from '../../lib/format';
import { LiveDot } from '../../components/ui';
import { WorldMap } from '../../components/world-map';
import { RegionClocks } from '../../components/region-clocks';

function Stat({ label, value, sub }) {
  return (
    <div className="px-5 py-4">
      <p className="label">{label}</p>
      <p className="num mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-mute">{sub}</p>
    </div>
  );
}

function Hero() {
  const { data, error } = useLive('/api/dashboard/summary', { interval: 5000 });
  const k = data?.kpis;
  return (
    <section className="relative overflow-hidden border-b border-line/[.06]">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,rgb(198_242_78/.09),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line/10 bg-white/[.03] px-3 py-1 text-xs text-soft animate-fadeUp">
            <DatabaseZap className="size-3.5 text-brand" /> Runs entirely on Oracle Database 23ai
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight animate-fadeUp sm:text-6xl" style={{ animationDelay: '60ms' }}>
            Find the failing service before your users do.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-soft animate-fadeUp sm:text-lg" style={{ animationDelay: '120ms' }}>
            Obsrv collects logs from every region, flags error spikes against a rolling baseline, and finds related incidents by meaning — all in one database, with no search cluster to run.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fadeUp" style={{ animationDelay: '180ms' }}>
            <Link href="/overview" className="btn btn-solid h-11 px-5 text-sm">Open the console <ArrowRight className="size-4" /></Link>
            <Link href="/search" className="btn btn-outline h-11 px-5 text-sm"><Sparkles className="size-4" /> Try Threat Search</Link>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl animate-fadeUp" style={{ animationDelay: '260ms' }}>
          <div className="overflow-hidden rounded-2xl border border-line/10 bg-panel shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)]">
            <div className="flex items-center justify-between border-b border-line/[.07] px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-mute"><span className="size-2.5 rounded-full bg-white/10" /><span className="size-2.5 rounded-full bg-white/10" /><span className="size-2.5 rounded-full bg-white/10" /><span className="ml-3">Live error activity · last 24 hours</span></div>
              <LiveDot active={!error} label={error ? 'API offline' : 'Live'} />
            </div>
            <div className="p-3 sm:p-5"><WorldMap regions={data?.regionErrors || []} interactive={false} /></div>
            <div className="grid grid-cols-2 divide-x divide-line/[.07] border-t border-line/[.07] md:grid-cols-4">
              <Stat label="Events · 24h" value={k ? compact(k.events24h) : '—'} sub="across 4 regions" />
              <Stat label="Errors · 24h" value={k ? integer(k.errors24h) : '—'} sub={k ? `${integer(k.critical24h)} critical` : 'waiting for API'} />
              <Stat label="Anomalies" value={k ? integer(k.anomalyCount) : '—'} sub="vs 24h baseline" />
              <Stat label="Ingest · 5 min" value={k ? integer(k.events5m) : '—'} sub="events received" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const VIEWS = [
  { icon: LineChart, title: 'Overview', href: '/overview', tag: 'See it',
    body: 'One screen for the whole system: critical events, 24-hour errors, a regional map, hourly trend and the services drifting from normal.',
    points: ['Regional error map', 'Hourly stacked trend', 'Anomaly detection panel'] },
  { icon: Radar, title: 'Security Events', href: '/logs', tag: 'Drill down',
    body: 'A filterable, live-tailing log table. Slice by region, service, severity and time; every timestamp is in that region’s own timezone.',
    points: ['Region, service, severity, date filters', 'Region-local timestamps', 'Raw JSON payload per event'] },
  { icon: Sparkles, title: 'Threat Search', href: '/search', tag: 'Understand it',
    body: 'Describe the problem in plain words. Oracle vector search returns related errors ranked by similarity, however they were worded.',
    points: ['Semantic, not keyword', 'Grouped by distinct issue', 'Jump from result to raw events'] }
];

function Views() {
  return (
    <section id="product" className="scroll-mt-20 border-b border-line/[.06]">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="label">Product</p>
        <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Spot it, drill into it, then find everything like it.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {VIEWS.map(({ icon: Icon, title, href, tag, body, points }) => (
            <Link key={title} href={href} className="group flex flex-col rounded-2xl border border-line/[.08] bg-panel p-6 transition-colors hover:border-line/20 hover:bg-raised">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="size-5" strokeWidth={1.6} /></span>
                <span className="text-xs text-mute">{tag}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-[14px] text-soft">{body}</p>
              <ul className="mt-5 space-y-2 border-t border-line/[.07] pt-5 text-[13px] text-soft">
                {points.map((p) => <li key={p} className="flex items-center gap-2"><span className="size-1 rounded-full bg-brand" />{p}</li>)}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 pt-1 text-[13px] font-medium text-ink">Open {title} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const BEFORE = ['Elasticsearch cluster', 'Kibana dashboards', 'Separate ML anomaly service', 'Vector store for similarity', 'Sync jobs to keep them aligned'];
const AFTER = [['JSON column', 'logs stored as native JSON, queried with SQL'], ['VECTOR(768)', 'embeddings beside the row they describe'], ['Materialized view', 'hourly error counts refreshed on commit'], ['Window functions', 'mean + 3σ baseline per service in plain SQL']];

function Stack() {
  return (
    <section id="stack" className="scroll-mt-20 border-b border-line/[.06] bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="label">Why one database</p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Replace a four-tool stack with the database you already trust.</h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line/[.08] p-6">
            <p className="label">Typical stack</p>
            <ul className="mt-5 space-y-3">
              {BEFORE.map((b) => <li key={b} className="flex items-center gap-3 text-[14px] text-mute"><span className="h-px w-4 bg-white/20" />{b}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand/25 bg-brand/[.04] p-6">
            <p className="label !text-brand">Obsrv on Oracle 23ai</p>
            <ul className="mt-5 space-y-3.5">
              {AFTER.map(([a, b]) => (
                <li key={a} className="flex items-baseline gap-3">
                  <span className="w-36 shrink-0 font-mono text-[13px] text-ink">{a}</span>
                  <span className="text-[14px] text-soft">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Ingest', body: 'Services POST JSON logs to one endpoint.' },
  { n: '02', title: 'Embed', body: 'Each message becomes a 768-dimension vector.' },
  { n: '03', title: 'Detect', body: 'Window functions compare the last hour to a 24-hour baseline.' },
  { n: '04', title: 'Search', body: 'VECTOR_DISTANCE ranks related errors by meaning.' }
];

function How() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-line/[.06]">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="label">How it works</p>
        <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Four steps, all inside SQL.</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line/[.08] bg-line/[.08] md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-bg p-6">
              <span className="font-mono text-xs text-brand">{s.n}</span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-[13px] text-soft">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-line/[.08] bg-panel">
            <figcaption className="flex items-center gap-2 border-b border-line/[.07] px-4 py-2.5 text-xs text-mute"><Braces className="size-3.5" /> POST /api/logs/ingest</figcaption>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-soft">{`{
  "timestamp": "2026-11-08T10:42:07.318+05:30",
  "service":   "payment-gateway",
  "region":    "India",
  "severity":  "E",
  "message":   "payment gateway timeout",
  "meta":      { "request_id": "req-482910" }
}`}</pre>
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-line/[.08] bg-panel">
            <figcaption className="flex items-center gap-2 border-b border-line/[.07] px-4 py-2.5 text-xs text-mute"><Globe2 className="size-3.5" /> Semantic search</figcaption>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-soft">{`SELECT message,
  VECTOR_DISTANCE(embedding,
    TO_VECTOR(:query), COSINE) AS distance
FROM   logs
ORDER  BY distance
FETCH  FIRST 10 ROWS ONLY;`}</pre>
          </figure>
        </div>
      </div>
    </section>
  );
}

function Regions() {
  const { data } = useLive('/api/dashboard/summary', { interval: 8000 });
  return (
    <section id="regions" className="scroll-mt-20 border-b border-line/[.06]">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="label">Regions</p>
        <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Four regions, each in its own time.</h2>
        <p className="mt-3 max-w-xl text-[15px] text-soft">An event at 02:00 in Tokyo isn’t 02:00 in San Francisco. Every log is stored in UTC and shown in the timezone of the region that produced it.</p>
        <div className="mt-10"><RegionClocks stats={data?.regionErrors} /></div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="mx-auto max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">See what’s breaking right now.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/overview" className="btn btn-solid h-11 px-5 text-sm">Open the console <ArrowRight className="size-4" /></Link>
          <Link href="/incidents" className="btn btn-outline h-11 px-5 text-sm">View incidents</Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Views />
      <Stack />
      <How />
      <Regions />
      <Cta />
    </main>
  );
}
