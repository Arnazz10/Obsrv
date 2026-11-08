'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, DatabaseZap, Radar, ScanSearch, Sparkles, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLive, useNow } from '../../lib/hooks';
import { compact, integer, relativeTime, SEVERITY, TONE_HEX, tzAbbrev } from '../../lib/format';
import { LiveDot } from '../../components/ui';
import { WorldMap } from '../../components/world-map';
import { RegionClocks } from '../../components/region-clocks';
import { CountUp, Reveal, Spot } from '../../components/fx';

const SEV_COLOR = { C: TONE_HEX.crit, E: TONE_HEX.err, W: TONE_HEX.warn, I: TONE_HEX.info };

function Ticker({ rows }) {
  if (!rows?.length) return <div className="h-12" />;
  const items = [...rows, ...rows];
  return (
    <div className="mask-fade-x relative overflow-hidden border-y border-line/[.06] bg-white/[.015] py-3.5" aria-label="Latest events">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap hover:[animation-play-state:paused]">
        {items.map((r, i) => (
          <span key={`${r.log_id}-${i}`} className="inline-flex items-center gap-2.5 text-[13px]">
            <span className="size-1.5 rounded-full" style={{ background: SEV_COLOR[r.severity] }} />
            <span className="font-mono text-xs text-mute">{r.service_name}</span>
            <span className="text-soft">{r.message}</span>
            <span className="text-xs text-mute/70">{r.region_name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, children, sub }) {
  return (
    <div className="px-5 py-5">
      <p className="label">{label}</p>
      <p className="num mt-2 text-3xl font-semibold tracking-tight">{children}</p>
      <p className="mt-1 text-xs text-mute">{sub}</p>
    </div>
  );
}

function Hero({ data, error }) {
  const k = data?.kpis;
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-180px] h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-brand/[.12] blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <a href="#how" className="mx-auto inline-flex items-center gap-2 rounded-full border border-line/10 bg-white/[.04] py-1 pl-1.5 pr-3 text-xs text-soft transition-colors hover:bg-white/[.07] animate-fadeUp">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 font-medium text-[#10130a]"><DatabaseZap className="size-3" /> Oracle 23ai</span>
            One database. Logs, vectors and anomaly detection.
            <ArrowUpRight className="size-3.5 text-mute" />
          </a>
          <h1 className="mt-7 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] animate-fadeUp sm:text-[76px]" style={{ animationDelay: '70ms' }}>
            Find the failing service <span className="font-display text-shine pr-1 text-[1.12em] font-normal italic tracking-[-0.02em]">before your users do.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-soft animate-fadeUp sm:text-lg" style={{ animationDelay: '140ms' }}>
            Obsrv pulls logs from every region, flags error spikes against a rolling baseline, and finds related incidents by meaning. No search cluster to run.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-fadeUp" style={{ animationDelay: '210ms' }}>
            <Link href="/overview" className="btn btn-solid h-12 px-6 text-sm shadow-[0_0_40px_-6px_rgb(198_242_78/.55)]">Open the console <ArrowRight className="size-4" /></Link>
            <Link href="/search" className="btn btn-outline h-12 px-6 text-sm"><Sparkles className="size-4 text-brand" /> Try Threat Search</Link>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl animate-fadeUp" style={{ animationDelay: '320ms' }}>
          <div aria-hidden className="absolute -inset-x-10 -bottom-10 top-10 -z-10 rounded-[40px] bg-brand/[.06] blur-3xl" />
          <div className="frame-glow overflow-hidden rounded-2xl border border-line/10 bg-panel shadow-[0_40px_100px_-30px_rgba(0,0,0,.9)]">
            <div className="flex items-center justify-between border-b border-line/[.07] px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-mute"><span className="size-2.5 rounded-full bg-white/10" /><span className="size-2.5 rounded-full bg-white/10" /><span className="size-2.5 rounded-full bg-white/10" /><span className="ml-3 font-mono">obsrv / error-activity · 24h</span></div>
              <LiveDot active={!error} label={error ? 'API offline' : 'Live'} />
            </div>
            <div className="relative p-3 sm:p-6">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_45%,rgb(198_242_78/.05),transparent)]" />
              <WorldMap regions={data?.regionErrors || []} interactive={false} arcs />
            </div>
            <div className="grid grid-cols-2 divide-x divide-line/[.07] border-t border-line/[.07] md:grid-cols-4">
              <Stat label="Events · 24h" sub="across 4 regions"><CountUp value={k?.events24h} format={compact} /></Stat>
              <Stat label="Errors · 24h" sub={k ? `${integer(k.critical24h)} critical` : 'waiting for API'}><CountUp value={k?.errors24h} /></Stat>
              <Stat label="Anomalies" sub="vs 24h baseline"><CountUp value={k?.anomalyCount} /></Stat>
              <Stat label="Ingest · 5 min" sub="events received"><CountUp value={k?.events5m} /></Stat>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, children, sub }) {
  return (
    <Reveal>
      <p className="label flex items-center gap-2"><span className="h-px w-6 bg-brand/70" />{eyebrow}</p>
      <h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">{children}</h2>
      {sub && <p className="mt-4 max-w-xl text-[15px] text-soft">{sub}</p>}
    </Reveal>
  );
}

function MiniBars({ data = [] }) {
  const max = Math.max(1, ...data.map((d) => d.errors + d.critical + d.warnings));
  return (
    <div className="flex h-28 items-end gap-1" aria-hidden>
      {data.map((d) => {
        const total = d.errors + d.critical + d.warnings;
        return (
          <div key={d.hour_start} className="flex flex-1 flex-col justify-end overflow-hidden rounded-[3px]" style={{ height: `${Math.max(6, (total / max) * 100)}%` }}>
            <div style={{ height: `${(d.critical / total) * 100}%`, background: TONE_HEX.crit }} />
            <div style={{ height: `${(d.errors / total) * 100}%`, background: TONE_HEX.err }} />
            <div style={{ height: `${(d.warnings / total) * 100}%`, background: TONE_HEX.warn }} />
          </div>
        );
      })}
    </div>
  );
}

function Bento({ data, rows, now }) {
  const anomalies = data?.anomalies || [];
  const card = 'spot group relative flex flex-col rounded-2xl border border-line/[.08] bg-panel p-6 transition-colors hover:border-line/20';
  return (
    <section id="product" className="scroll-mt-20 border-t border-line/[.06]">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead eyebrow="Product" sub="Three views that follow how an incident actually unfolds.">Spot it, drill into it, then find everything like it.</SectionHead>
        <div className="mt-14 grid gap-4 md:grid-cols-6">
          <Reveal className="md:col-span-4">
            <Spot as={Link} href="/overview" className={cn(card, 'h-full')}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="label text-brand">01 · Overview</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">The whole system on one screen</h3>
                  <p className="mt-2 max-w-md text-[14px] text-soft">Critical events, 24-hour errors, a regional map and the services drifting from normal.</p>
                </div>
                <ArrowUpRight className="size-5 text-mute transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
              </div>
              <div className="mt-8"><MiniBars data={data?.hourlyTrend} /></div>
              <div className="mt-3 flex justify-between text-[11px] text-mute"><span>24h ago</span><span>now</span></div>
            </Spot>
          </Reveal>
          <Reveal delay={80} className="md:col-span-2">
            <Spot as={Link} href="/logs" className={cn(card, 'h-full')}>
              <span className="label text-brand">02 · Security Events</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Drill down, live</h3>
              <p className="mt-2 text-[14px] text-soft">Filter by region, service, severity and date, in each region’s local time.</p>
              <ul className="mt-6 space-y-2">
                {(rows || []).slice(0, 4).map((r) => (
                  <li key={r.log_id} className="flex items-center gap-2 rounded-lg bg-white/[.03] px-3 py-2 text-xs">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: SEV_COLOR[r.severity] }} />
                    <span className="truncate text-soft">{r.message}</span>
                  </li>
                ))}
              </ul>
            </Spot>
          </Reveal>
          <Reveal className="md:col-span-3">
            <Spot as={Link} href="/search" className={cn(card, 'h-full')}>
              <span className="label text-brand">03 · Threat Search</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Ask in plain language</h3>
              <p className="mt-2 text-[14px] text-soft">“Users can’t log in” finds “identity provider unavailable”. Ranked by vector distance, not keywords.</p>
              <pre className="mt-6 overflow-x-auto rounded-xl border border-line/[.07] bg-black/30 p-4 font-mono text-[12px] leading-relaxed text-soft"><span className="text-brand">SELECT</span> message,{'\n'}  <span className="text-brand">VECTOR_DISTANCE</span>(embedding,{'\n'}    TO_VECTOR(:q), COSINE) d{'\n'}<span className="text-brand">FROM</span> logs <span className="text-brand">ORDER BY</span> d;</pre>
            </Spot>
          </Reveal>
          <Reveal delay={80} className="md:col-span-3">
            <Spot as={Link} href="/incidents" className={cn(card, 'h-full')}>
              <span className="label text-brand">04 · Incidents</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Anomalies, flagged for you</h3>
              <p className="mt-2 text-[14px] text-soft">The latest hour is compared to a 24-hour baseline. Three sigma above it raises a flag.</p>
              <ul className="mt-6 space-y-2">
                {anomalies.slice(0, 2).map((a) => (
                  <li key={a.service_id} className="flex items-center gap-3 rounded-xl border border-crit/20 bg-crit/[.06] px-3.5 py-3">
                    <TriangleAlert className="size-4 shrink-0 text-crit" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate text-[13px]"><span className="font-mono">{a.service_name}</span> <span className="text-mute">· {a.region_name}</span></span>
                    <span className="num text-xs font-medium text-crit">{Number(a.score).toFixed(1)}σ</span>
                  </li>
                ))}
                {!anomalies.length && <li className="rounded-xl border border-line/[.07] px-3.5 py-3 text-[13px] text-mute">No anomalies right now.</li>}
              </ul>
            </Spot>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const BEFORE = ['Elasticsearch cluster', 'Kibana dashboards', 'Separate ML anomaly service', 'Vector store for similarity', 'Sync jobs to keep them aligned'];
const AFTER = [['JSON', 'logs stored as native JSON, queried in SQL'], ['VECTOR(768)', 'embeddings beside the row they describe'], ['Materialized view', 'hourly error counts, refreshed on commit'], ['Window functions', 'mean + 3σ baseline per service']];

function Stack() {
  return (
    <section id="stack" className="scroll-mt-20 border-t border-line/[.06] bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead eyebrow="Why one database">Replace a five-tool stack with <span className="font-display italic text-brand">one</span>.</SectionHead>
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <Reveal className="rounded-2xl border border-line/[.08] p-7">
            <p className="label">Typical stack</p>
            <ul className="mt-6 space-y-4">
              {BEFORE.map((b) => <li key={b} className="flex items-center gap-3 text-[15px] text-mute line-through decoration-white/20"><span className="size-1.5 rounded-full bg-white/20" />{b}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={90} className="frame-glow rounded-2xl border border-brand/20 bg-brand/[.04] p-7">
            <p className="label !text-brand">Obsrv on Oracle 23ai</p>
            <ul className="mt-6 space-y-4">
              {AFTER.map(([a, b]) => (
                <li key={a} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="w-40 shrink-0 font-mono text-[13px] text-ink">{a}</span>
                  <span className="text-[15px] text-soft">{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Ingest', body: 'Services POST JSON logs to a single endpoint.' },
  { n: '02', title: 'Embed', body: 'Every message becomes a 768-dimension vector.' },
  { n: '03', title: 'Detect', body: 'Window functions compare the last hour to a 24-hour baseline.' },
  { n: '04', title: 'Search', body: 'VECTOR_DISTANCE ranks related errors by meaning.' }
];

function LiveTail({ rows, now }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line/[.08] bg-[#08090b]">
      <figcaption className="flex items-center justify-between border-b border-line/[.07] px-4 py-2.5 text-xs text-mute">
        <span className="font-mono">$ tail -f obsrv/events <span className="text-mute/60">(UTC)</span></span><LiveDot />
      </figcaption>
      <ul className="space-y-1 p-4 font-mono text-[12px] leading-relaxed">
        {(rows || []).slice(0, 8).map((r) => (
          <li key={r.log_id} className="flex gap-3 whitespace-nowrap animate-rowIn">
            <span className="text-mute/70">{r.utc_time.slice(11, 19)}</span>
            <span className="w-6 shrink-0 font-semibold" style={{ color: SEV_COLOR[r.severity] }}>{SEVERITY[r.severity]?.label.slice(0, 4).toUpperCase()}</span>
            <span className="hidden w-36 shrink-0 text-soft sm:block">{r.service_name}</span>
            <span className="hidden w-12 shrink-0 text-mute md:block">{r.region_name}</span>
            <span className="truncate text-ink/90">{r.message}</span>
          </li>
        ))}
        {!rows && <li className="text-mute">waiting for events…</li>}
      </ul>
    </figure>
  );
}

function How({ rows, now }) {
  return (
    <section id="how" className="scroll-mt-20 border-t border-line/[.06]">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead eyebrow="How it works">Four steps, <span className="font-display italic text-brand">all inside SQL.</span></SectionHead>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line/[.08] bg-line/[.08] md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 70} className="group bg-bg p-6 transition-colors hover:bg-panel">
              <span className="font-mono text-xs text-brand">{s.n}</span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[13px] text-soft">{s.body}</p>
            </Reveal>
          ))}
        </ol>
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Reveal>
            <figure className="h-full overflow-hidden rounded-2xl border border-line/[.08] bg-panel">
              <figcaption className="border-b border-line/[.07] px-4 py-2.5 font-mono text-xs text-mute">POST /api/logs/ingest</figcaption>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-soft">{`{
  "timestamp": "2026-11-08T10:42:07+05:30",
  "service":   "payment-gateway",
  "region":    "India",
  "severity":  "E",
  "message":   "payment gateway timeout",
  "meta": { "request_id": "req-482910" }
}`}</pre>
            </figure>
          </Reveal>
          <Reveal delay={90}><LiveTail rows={rows} now={now} /></Reveal>
        </div>
      </div>
    </section>
  );
}

function Regions({ data }) {
  return (
    <section id="regions" className="scroll-mt-20 border-t border-line/[.06]">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead eyebrow="Regions" sub="An event at 02:00 in Tokyo isn’t 02:00 in San Francisco. Logs are stored in UTC and shown in the timezone of the region that produced them.">Four regions, each in <span className="font-display italic text-brand">its own time.</span></SectionHead>
        <Reveal className="mt-12"><RegionClocks stats={data?.regionErrors} /></Reveal>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-line/[.06]">
      <div aria-hidden className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_80%_at_50%_100%,#000,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[.10] blur-[110px]" />
      <Reveal className="relative mx-auto max-w-3xl px-5 py-28 text-center">
        <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">See what’s breaking <span className="font-display italic text-brand">right now.</span></h2>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/overview" className="btn btn-solid h-12 px-6 text-sm shadow-[0_0_40px_-6px_rgb(198_242_78/.55)]">Open the console <ArrowRight className="size-4" /></Link>
          <Link href="/incidents" className="btn btn-outline h-12 px-6 text-sm">View incidents</Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function LandingPage() {
  const summary = useLive('/api/dashboard/summary', { interval: 6000 });
  const feed = useLive('/api/logs?limit=14', { interval: 4000 });
  const now = useNow(5000);
  const rows = feed.data?.rows;
  return (
    <main>
      <Hero data={summary.data} error={summary.error && !summary.data} />
      <Ticker rows={rows} />
      <Bento data={summary.data} rows={rows} now={now} />
      <Stack />
      <How rows={rows} now={now} />
      <Regions data={summary.data} />
      <Cta />
    </main>
  );
}
