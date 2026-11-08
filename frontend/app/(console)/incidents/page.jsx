'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BellOff, Check, CheckCircle2, ClipboardCopy, FilePlus2, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLive, useNow } from '../../../lib/hooks';
import { relativeTime, SEVERITY } from '../../../lib/format';
import { EmptyState, ErrorNotice, LiveDot, PageHeader, Panel, SeverityBadge, Skeleton } from '../../../components/ui';

const STORE = 'obsrv.incidents.v2';
const AUDIENCES = ['Customers', 'Engineering', 'Database team', 'Leadership'];
const blank = { title: '', audience: AUDIENCES[0], severity: 'W', message: '' };

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE)) || { acked: [], drafts: [] }; } catch { return { acked: [], drafts: [] }; }
}

export default function IncidentsPage() {
  const summary = useLive('/api/dashboard/summary', { interval: 8000 });
  const events = useLive('/api/logs?severity=C,E&limit=40&since_minutes=360', { interval: 8000 });
  const now = useNow(10000);

  const [store, setStore] = useState({ acked: [], drafts: [] });
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState('open');
  const [form, setForm] = useState(blank);
  const [copied, setCopied] = useState('');
  const composer = useRef(null);

  useEffect(() => { setStore(loadStore()); setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORE, JSON.stringify(store)); } catch { /* storage unavailable */ } } }, [store, ready]);

  const signals = useMemo(() => {
    const anomalies = (summary.data?.anomalies || []).map((a) => ({
      id: `anomaly:${a.service_name}:${a.region_name}:${a.hour_start_utc}`,
      kind: 'Anomaly', severity: 'C', service: a.service_name, region: a.region_name,
      title: `Error spike on ${a.service_name} (${a.region_name})`,
      detail: `${a.error_count} errors in the latest hour against a baseline of ${Number(a.baseline_avg).toFixed(1)} — ${Number(a.score).toFixed(1)}σ above normal.`,
      at: a.hour_start_utc
    }));
    const critical = new Map();
    for (const row of events.data?.rows || []) {
      if (row.severity !== 'C') continue;
      const key = `${row.service_name}:${row.region_name}:${row.message}`;
      const prev = critical.get(key);
      if (prev) { prev.count += 1; continue; }
      critical.set(key, {
        id: `critical:${key}`, kind: 'Critical event', severity: 'C', service: row.service_name, region: row.region_name,
        title: row.message, detail: row.user_impact || 'Review impact and decide whether to notify users.', at: row.utc_time, count: 1, logId: row.log_id
      });
    }
    return [...anomalies, ...critical.values()];
  }, [summary.data, events.data]);

  const visible = signals.filter((s) => (filter === 'open' ? !store.acked.includes(s.id) : filter === 'acked' ? store.acked.includes(s.id) : true));
  const toggleAck = (id) => setStore((s) => ({ ...s, acked: s.acked.includes(id) ? s.acked.filter((x) => x !== id) : [...s.acked, id] }));

  const draftFrom = (s) => {
    composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setForm({
    title: s.title, audience: AUDIENCES[0], severity: s.severity,
    message: `We are investigating ${s.kind === 'Anomaly' ? 'elevated error rates' : 'an issue'} affecting ${s.service} in ${s.region}. ${s.detail}\n\nNext update in 30 minutes.`
    });
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setStore((s) => ({ ...s, drafts: [{ ...form, id: String(Date.now()), createdAt: new Date().toISOString() }, ...s.drafts] }));
    setForm(blank);
  };

  const copy = async (draft) => {
    await navigator.clipboard?.writeText(`[${SEVERITY[draft.severity].label}] ${draft.title}\nTo: ${draft.audience}\n\n${draft.message}`);
    setCopied(draft.id);
    setTimeout(() => setCopied(''), 1600);
  };

  const loading = summary.loading && !summary.data;
  const openCount = signals.filter((s) => !store.acked.includes(s.id)).length;

  return (
    <>
      <PageHeader title="Incidents" description="Anomalies and critical events that need a human, plus ready-to-send updates.">
        <LiveDot />
      </PageHeader>
      <ErrorNotice error={summary.error && !summary.data ? summary.error : null} onRetry={summary.refresh} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel
          title="Active signals"
          description="Anomalies in the latest hour and critical events from the last 6 hours"
          action={
            <div className="flex rounded-lg bg-white/[.04] p-0.5 text-xs">
              {[['open', `Open ${openCount}`], ['acked', 'Acknowledged'], ['all', 'All']].map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={cn('rounded-md px-2.5 py-1 font-medium transition-colors', filter === key ? 'bg-white/10 text-ink' : 'text-mute hover:text-ink')}>{label}</button>
              ))}
            </div>
          }
        >
          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : visible.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={filter === 'open' ? 'All clear' : 'Nothing here'} body={filter === 'open' ? 'No open anomalies or critical events. New ones appear here as they are detected.' : 'No signals in this view.'} />
          ) : (
            <ul className="divide-y divide-line/[.06]">
              {visible.map((s) => {
                const acked = store.acked.includes(s.id);
                return (
                  <li key={s.id} className={cn('flex gap-3 px-4 py-4', acked && 'opacity-55')}>
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-crit" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-medium">{s.title}</p>
                        <SeverityBadge value={s.severity} />
                        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-mute">{s.kind}{s.count > 1 ? ` · ×${s.count}` : ''}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-soft">{s.detail}</p>
                      <p className="mt-1 text-xs text-mute"><span className="font-mono">{s.service}</span> · {s.region} · {relativeTime(s.at, now)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={s.logId ? `/logs?open=${s.logId}` : `/logs/${encodeURIComponent(s.service)}`} className="btn btn-outline h-8 text-xs">Investigate</Link>
                        <button className="btn btn-ghost h-8 text-xs" onClick={() => draftFrom(s)}><FilePlus2 className="size-3.5" /> Draft update</button>
                        <button className="btn btn-ghost h-8 text-xs" onClick={() => toggleAck(s.id)}>{acked ? <><BellOff className="size-3.5" /> Reopen</> : <><Check className="size-3.5" /> Acknowledge</>}</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-3">
          <Panel title="Status update" description="Compose a message, then copy it to your comms channel" bodyClassName="p-4">
            <form ref={composer} onSubmit={save} className="space-y-3">
              <input className="field" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
              <div className="grid grid-cols-2 gap-2">
                <select className="field" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} aria-label="Audience">{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select>
                <select className="field" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} aria-label="Severity">{Object.values(SEVERITY).sort((a, b) => b.rank - a.rank).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
              </div>
              <textarea className="field min-h-28" rows={5} placeholder="What is affected, what you are doing, when the next update lands." required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-label="Message" />
              <button className="btn btn-solid w-full" type="submit">Save draft</button>
              <p className="text-xs text-mute">Drafts are stored in this browser only.</p>
            </form>
          </Panel>

          <Panel title="Drafts" action={<span className="num text-xs text-mute">{store.drafts.length}</span>}>
            {store.drafts.length === 0 ? (
              <EmptyState icon={FilePlus2} title="No drafts yet" body="Use “Draft update” on a signal to start from its details." />
            ) : (
              <ul className="divide-y divide-line/[.06]">
                {store.drafts.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{d.title}</p>
                        <p className="mt-0.5 text-xs text-mute">{d.audience} · {relativeTime(d.createdAt, now)}</p>
                      </div>
                      <SeverityBadge value={d.severity} />
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-soft">{d.message}</p>
                    <div className="mt-2 flex gap-1">
                      <button className="btn btn-ghost h-7 px-2 text-xs" onClick={() => copy(d)}>{copied === d.id ? <><Check className="size-3.5" /> Copied</> : <><ClipboardCopy className="size-3.5" /> Copy</>}</button>
                      <button className="btn btn-ghost h-7 px-2 text-xs" onClick={() => setForm({ title: d.title, audience: d.audience, severity: d.severity, message: d.message })}>Edit</button>
                      <button className="btn btn-ghost h-7 px-2 text-xs text-mute hover:text-crit" onClick={() => setStore((s) => ({ ...s, drafts: s.drafts.filter((x) => x.id !== d.id) }))}><Trash2 className="size-3.5" /> Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
