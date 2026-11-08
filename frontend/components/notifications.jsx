'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, Megaphone, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLive, useNow } from '../lib/hooks';
import { AUDIENCE, relativeTime } from '../lib/format';
import { SeverityBadge } from './ui';

export function AudienceTag({ value }) {
  const a = AUDIENCE[value] || AUDIENCE.BOTH;
  return <span className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset', a.tone)}>{a.label}</span>;
}

const SEEN_KEY = 'obsrv.notifications.seen';

export function NotificationBell({ align = 'left' }) {
  const { data } = useLive('/api/notifications?limit=15', { interval: 8000 });
  const now = useNow(15000);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [seen, setSeen] = useState(0);
  const box = useRef(null);
  const items = data?.notifications || [];
  const newest = items[0]?.notification_id || 0;

  useEffect(() => { try { setSeen(Number(localStorage.getItem(SEEN_KEY)) || 0); } catch { /* storage unavailable */ } }, []);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const unread = items.filter((n) => n.notification_id > seen).length;
  const toggle = () => {
    setOpen((v) => !v);
    if (!open && newest) { setSeen(newest); try { localStorage.setItem(SEEN_KEY, String(newest)); } catch { /* storage unavailable */ } }
  };
  const shown = items.filter((n) => tab === 'ALL' || n.audience === tab || n.audience === 'BOTH');

  return (
    <div ref={box} className="relative">
      <button onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} new` : ''}`} aria-expanded={open} className="btn btn-ghost relative size-9 px-0">
        <Bell className="size-4" strokeWidth={1.8} />
        {unread > 0 && <span className="num absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-crit px-1 text-[10px] font-semibold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className={cn('absolute z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] animate-fadeUp overflow-hidden rounded-xl border border-line/10 bg-raised shadow-2xl', align === 'right' ? 'right-0' : 'left-0')} role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b border-line/[.07] px-3 py-2.5">
            <div className="flex rounded-lg bg-white/[.05] p-0.5 text-xs">
              {[['ALL', 'All'], ['DBA', 'DBA'], ['USERS', 'Users']].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={cn('rounded-md px-2.5 py-1 font-medium', tab === k ? 'bg-white/10 text-ink' : 'text-mute hover:text-ink')}>{l}</button>
              ))}
            </div>
            <Link href="/incidents" onClick={() => setOpen(false)} className="text-xs text-mute hover:text-ink">Alerts &amp; comms</Link>
          </div>
          <ul className="max-h-[380px] divide-y divide-line/[.06] overflow-y-auto">
            {shown.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-mute">No notifications yet.</li>}
            {shown.map((n) => (
              <li key={n.notification_id} className="px-4 py-3">
                <div className="flex items-center gap-2"><SeverityBadge value={n.severity} /><AudienceTag value={n.audience} /><span className="ml-auto text-[11px] text-mute">{relativeTime(n.created_at, now)}</span></div>
                <p className="mt-1.5 text-[13px] font-medium leading-snug">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-mute">{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Shows the latest user-facing warning, if one was sent in the last 6 hours. */
export function StatusBanner() {
  const { data } = useLive('/api/status', { interval: 15000 });
  const [dismissed, setDismissed] = useState('');
  const notice = data?.notices?.[0];
  useEffect(() => { try { setDismissed(sessionStorage.getItem('obsrv.banner.dismissed') || ''); } catch { /* storage unavailable */ } }, []);
  if (!notice || String(notice.notification_id) === dismissed) return null;
  const critical = notice.severity === 'C' || notice.severity === 'E';
  return (
    <div role="status" className={cn('flex items-start gap-3 border-b px-4 py-2.5 text-[13px]', critical ? 'border-crit/25 bg-crit/10 text-crit' : 'border-warn/25 bg-warn/10 text-warn')}>
      <Megaphone className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
      <p className="min-w-0 flex-1 text-ink"><span className="font-semibold">{notice.title}.</span> <span className="text-soft">{notice.message}</span></p>
      <button aria-label="Dismiss" className="shrink-0 text-mute hover:text-ink" onClick={() => { setDismissed(String(notice.notification_id)); try { sessionStorage.setItem('obsrv.banner.dismissed', String(notice.notification_id)); } catch { /* storage unavailable */ } }}><X className="size-4" /></button>
    </div>
  );
}
