'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BellOff, Check, CheckCircle2, Megaphone, Send, ShieldCheck, Undo2, Users, Wrench } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { postJson } from '../../../lib/api';
import { useLive, useNow } from '../../../lib/hooks';
import { AUDIENCE, relativeTime, SERVICE_IMPACT, SEVERITY } from '../../../lib/format';
import { EmptyState, ErrorNotice, LiveDot, PageHeader, Panel, SeverityBadge, Skeleton } from '../../../components/ui';
import { AudienceTag } from '../../../components/notifications';

const STATUS_TABS = [['OPEN', 'Open'], ['ACKED', 'Acknowledged'], ['RESOLVED', 'Resolved'], ['', 'All']];
const blank = { audience: 'BOTH', severity: 'W', title: '', message: '', dbaMessage: '', alert_id: undefined };

function templates(alert) {
  const place = alert.region_name ? ` in ${alert.region_name}` : '';
  const impact = SERVICE_IMPACT[alert.service_name] || 'Some features may be slower than usual.';
  return {
    DBA: `${alert.detail}\n\nService: ${alert.service_name} (${alert.region_name})\nCheck connection pools, slow queries and recent deploys. Logs: /logs/${alert.service_name}`,
    USERS: `We’re aware of a problem affecting ${alert.service_name.replace(/-/g, ' ')}${place}. ${impact} Our team is working on it and we’ll post another update within 30 minutes.`
  };
}

export default function AlertsPage() {
  const [tab, setTab] = useState('OPEN');
  const alerts = useLive(`/api/alerts${tab ? `?status=${tab}` : ''}`, { interval: 6000 });
  const sent = useLive('/api/notifications?limit=25', { interval: 6000 });
  const now = useNow(10000);

  const [form, setForm] = useState(blank);
  const [state, setState] = useState({ busy: false, ok: '', error: '' });
  const composer = useRef(null);

  const counts = alerts.data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const list = alerts.data?.alerts || [];
  const loading = alerts.loading && !alerts.data;

  const prefill = (alert, audience) => {
    const t = templates(alert);
    setForm({
      audience, severity: alert.severity, alert_id: alert.alert_id,
      title: audience === 'USERS' ? `Service disruption: ${alert.service_name.replace(/-/g, ' ')}` : alert.title,
      message: audience === 'DBA' ? t.DBA : t.USERS,
      dbaMessage: audience === 'BOTH' ? t.DBA : ''
    });
    setState({ busy: false, ok: '', error: '' });
    composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const act = async (id, action) => {
    try { await postJson(`/api/alerts/${id}/${action}`, {}); await alerts.refresh(); } catch (error) { setState({ busy: false, ok: '', error: error.message }); }
  };

  const send = async (e) => {
    e.preventDefault();
    setState({ busy: true, ok: '', error: '' });
    try {
      const { dbaMessage, ...base } = form;
      let res;
      if (form.audience === 'BOTH' && dbaMessage.trim()) {
        // Users get the plain-language text; the DBA gets the technical detail as a separate notice.
        res = await postJson('/api/notifications', { ...base, audience: 'USERS' });
        await postJson('/api/notifications', { ...base, audience: 'DBA', message: dbaMessage.trim() });
      } else {
        res = await postJson('/api/notifications', base);
      }
      setState({ busy: false, ok: `Sent to ${AUDIENCE[form.audience].label} via ${res.channels}.`, error: '' });
      setForm(blank);
      sent.refresh();
    } catch (error) {
      setState({ busy: false, ok: '', error: error.message });
    }
  };

  const audiences = useMemo(() => [['BOTH', 'Users + DBA', Megaphone], ['USERS', 'Users', Users], ['DBA', 'DBA', Wrench]], []);

  return (
    <>
      <PageHeader title="Alerts & Communications" description="Detected alerts, warning messages to users, and technical notices to the DBA team.">
        <LiveDot />
      </PageHeader>
      <ErrorNotice error={alerts.error && !alerts.data ? alerts.error : null} onRetry={alerts.refresh} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-3">
          <Panel
            title="Alerts"
            description="Raised automatically from error spikes and bursts of critical events. The DBA is notified on detection."
            action={
              <div className="flex rounded-lg bg-white/[.04] p-0.5 text-xs">
                {STATUS_TABS.map(([key, label]) => (
                  <button key={label} onClick={() => setTab(key)} className={cn('rounded-md px-2.5 py-1 font-medium transition-colors', tab === key ? 'bg-white/10 text-ink' : 'text-mute hover:text-ink')}>
                    {label}{key ? <span className="num ml-1 text-mute">{counts[key] || 0}</span> : <span className="num ml-1 text-mute">{total}</span>}
                  </button>
                ))}
              </div>
            }
          >
            {loading ? (
              <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : list.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={tab === 'OPEN' ? 'All clear' : 'Nothing here'} body="New alerts appear within about 20 seconds of an anomaly or a burst of critical events." />
            ) : (
              <ul className="divide-y divide-line/[.06]">
                {list.map((a) => (
                  <li key={a.alert_id} className={cn('px-4 py-4', a.status === 'RESOLVED' && 'opacity-55')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium">{a.title}</p>
                      <SeverityBadge value={a.severity} />
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-mute">{a.alert_type === 'ANOMALY' ? 'Anomaly' : 'Critical burst'}</span>
                      {a.status !== 'OPEN' && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-soft">{a.status === 'ACKED' ? 'Acknowledged' : 'Resolved'}</span>}
                    </div>
                    <p className="mt-1.5 text-[13px] text-soft">{a.detail}</p>
                    <p className="mt-1 text-xs text-mute"><span className="font-mono">{a.service_name}</span> · {a.region_name} · raised {relativeTime(a.created_at, now)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={a.log_id ? `/logs?open=${a.log_id}` : `/logs/${encodeURIComponent(a.service_name)}`} className="btn btn-outline h-8 text-xs">Investigate</Link>
                      <button className="btn btn-outline h-8 text-xs" onClick={() => prefill(a, 'BOTH')}><Megaphone className="size-3.5" /> Warn users &amp; DBA</button>
                      <button className="btn btn-ghost h-8 text-xs" onClick={() => prefill(a, 'DBA')}><Wrench className="size-3.5" /> DBA only</button>
                      {a.status === 'OPEN' && <button className="btn btn-ghost h-8 text-xs" onClick={() => act(a.alert_id, 'ack')}><BellOff className="size-3.5" /> Acknowledge</button>}
                      {a.status !== 'RESOLVED' && <button className="btn btn-ghost h-8 text-xs" onClick={() => act(a.alert_id, 'resolve')}><Check className="size-3.5" /> Resolve</button>}
                      {a.status !== 'OPEN' && <button className="btn btn-ghost h-8 text-xs" onClick={() => act(a.alert_id, 'reopen')}><Undo2 className="size-3.5" /> Reopen</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Sent messages" description="Everything delivered to users and the DBA team, newest first">
            {!sent.data ? <div className="space-y-2 p-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : sent.data.notifications.length === 0 ? (
              <EmptyState icon={Send} title="Nothing sent yet" body="Detected alerts notify the DBA automatically. Warn users from an alert or the form." />
            ) : (
              <ul className="divide-y divide-line/[.06]">
                {sent.data.notifications.map((n) => (
                  <li key={n.notification_id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge value={n.severity} /><AudienceTag value={n.audience} />
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-mute">{n.source === 'AUTO' ? 'Automatic' : 'Manual'} · {n.channels}</span>
                      <span className="ml-auto text-xs text-mute">{relativeTime(n.created_at, now)}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-soft">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Send a warning" description="Users see it as a banner across the site. The DBA sees it in the notification bell." bodyClassName="p-4" className="h-fit xl:sticky xl:top-6">
          <form ref={composer} onSubmit={send} className="space-y-3">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[.04] p-1" role="radiogroup" aria-label="Audience">
              {audiences.map(([key, label, Icon]) => (
                <button type="button" key={key} role="radio" aria-checked={form.audience === key} onClick={() => setForm({ ...form, audience: key })}
                  className={cn('flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors', form.audience === key ? 'bg-white/10 text-ink' : 'text-mute hover:text-ink')}>
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <input className="field" placeholder="Title" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
              <select className="field" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} aria-label="Severity">
                {Object.values(SEVERITY).sort((a, b) => b.rank - a.rank).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <textarea className="field min-h-28" rows={5} required minLength={3} placeholder={form.audience === 'DBA' ? 'Technical detail for the DBA team.' : 'What is affected, what you are doing, and when the next update lands.'} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-label="Message" />
            {form.audience === 'BOTH' && (
              <label className="block text-xs text-mute">DBA technical detail (sent separately, not shown to users)
                <textarea className="field mt-1.5 min-h-24" rows={4} value={form.dbaMessage} onChange={(e) => setForm({ ...form, dbaMessage: e.target.value })} aria-label="DBA technical detail" />
              </label>
            )}
            {form.audience !== 'DBA' && (
              <p className="flex items-start gap-2 rounded-lg bg-white/[.03] p-3 text-xs text-mute"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" /> User-facing text is shown publicly. Keep it plain and leave out hostnames and internals.</p>
            )}
            {state.error && <p className="text-[13px] text-err">{state.error}</p>}
            {state.ok && <p className="flex items-center gap-1.5 text-[13px] text-brand"><Check className="size-4" /> {state.ok}</p>}
            <button className="btn btn-solid w-full" type="submit" disabled={state.busy}><Send className="size-4" /> {state.busy ? 'Sending…' : `Send to ${AUDIENCE[form.audience].label}`}</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
