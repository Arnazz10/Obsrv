'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Copy, ExternalLink, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLive, useNow } from '../lib/hooks';
import { relativeTime, tzAbbrev } from '../lib/format';
import { EmptyState, SeverityBadge, Skeleton } from './ui';

export function LogTable({ rows, loading, now, onOpen, selectedId, showService = true, emptyBody }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line/[.07] text-[11px] uppercase tracking-[.08em] text-mute">
            <th className="w-52 px-4 py-2.5 font-medium">Local time</th>
            <th className="w-28 px-2 py-2.5 font-medium">Severity</th>
            {showService && <th className="w-44 px-2 py-2.5 font-medium">Service</th>}
            <th className="w-24 px-2 py-2.5 font-medium">Region</th>
            <th className="px-2 py-2.5 font-medium">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/[.05]">
          {loading && !rows && Array.from({ length: 8 }).map((_, i) => (
            <tr key={i}><td colSpan={5} className="px-4 py-2"><Skeleton className="h-6" /></td></tr>
          ))}
          {rows?.map((row) => (
            <tr
              key={row.log_id}
              onClick={() => onOpen(row.log_id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row.log_id); } }}
              tabIndex={0}
              className={cn('cursor-pointer transition-colors hover:bg-white/[.035] focus-visible:bg-white/[.05]', selectedId === row.log_id && 'bg-brand/[.06]')}
            >
              <td className="px-4 py-2.5 align-top">
                <div className="num whitespace-nowrap font-mono text-xs">{row.local_log_time} <span className="text-mute">{tzAbbrev(row.region_tz)}</span></div>
                <div className="num text-[11px] text-mute">{relativeTime(row.utc_time, now)}</div>
              </td>
              <td className="px-2 py-2.5 align-top"><SeverityBadge value={row.severity} /></td>
              {showService && <td className="px-2 py-2.5 align-top font-mono text-xs text-soft">{row.service_name}</td>}
              <td className="px-2 py-2.5 align-top text-soft">{row.region_name}</td>
              <td className="px-2 py-2.5 align-top">{row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows && rows.length === 0 && (
        <EmptyState icon={Search} title="No events match" body={emptyBody || 'Try widening the time range or clearing a filter.'} />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-[13px]">{children}</dd>
    </div>
  );
}

export function LogDrawer({ id, onClose, onOpen }) {
  const { data, error } = useLive(id ? `/api/logs/${id}` : null, { interval: 0, enabled: Boolean(id) });
  const now = useNow(15000);

  useEffect(() => {
    if (!id) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  if (!id) return null;
  const log = data?.log?.log_id === Number(id) ? data.log : null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/55" aria-label="Close details" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[460px] animate-slideIn flex-col border-l border-line/10 bg-panel shadow-2xl" role="dialog" aria-label="Event details">
        <header className="flex items-center justify-between border-b border-line/[.07] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold">Event #{id}</h2>
            {log && <SeverityBadge value={log.severity} />}
          </div>
          <button className="btn btn-ghost size-8 px-0" onClick={onClose} aria-label="Close"><X className="size-4" /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {error && <p className="text-sm text-err">{error.message}</p>}
          {!log && !error && <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-24" /></div>}
          {log && (
            <>
              <p className="text-[15px] font-medium leading-snug">{log.message}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <Field label="Service"><Link className="font-mono text-xs hover:text-brand hover:underline" href={`/logs/${encodeURIComponent(log.service_name)}`}>{log.service_name}</Link></Field>
                <Field label="Region">{log.region_name}</Field>
                <Field label={`Local time (${tzAbbrev(log.region_tz)})`}><span className="num font-mono text-xs">{log.local_log_time}</span></Field>
                <Field label="UTC"><span className="num font-mono text-xs">{log.utc_time}</span></Field>
                {log.user_impact && <div className="col-span-2"><Field label="User impact">{log.user_impact}</Field></div>}
              </dl>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label">Raw payload</span>
                  <button className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-ink" onClick={() => navigator.clipboard?.writeText(JSON.stringify(log.payload, null, 2))}><Copy className="size-3.5" /> Copy</button>
                </div>
                <pre className="max-h-56 overflow-auto rounded-lg border border-line/[.07] bg-black/30 p-3 font-mono text-xs leading-relaxed text-soft">{JSON.stringify(log.payload, null, 2)}</pre>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label">Related by meaning</span>
                  <Link href={`/search?q=${encodeURIComponent(log.message)}`} className="inline-flex items-center gap-1 text-xs text-mute hover:text-ink">Open in Threat Search <ExternalLink className="size-3" /></Link>
                </div>
                <ul className="divide-y divide-line/[.06] rounded-lg border border-line/[.07]">
                  {(data.related || []).map((r) => (
                    <li key={r.log_id}>
                      <button onClick={() => onOpen(r.log_id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[.04]">
                        <SeverityBadge value={r.severity} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">{r.message}</span>
                          <span className="block truncate font-mono text-[11px] text-mute">{r.service_name} · {r.region_name}</span>
                        </span>
                        <span className="num text-xs text-mute">{Math.round(r.similarity * 100)}%</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
