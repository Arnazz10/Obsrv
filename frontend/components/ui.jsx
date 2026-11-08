import Link from 'next/link';
import { cn } from '../lib/utils';
import { SEVERITY, TONE_CLASS } from '../lib/format';

export function SeverityBadge({ value, className }) {
  const meta = SEVERITY[value] || SEVERITY.I;
  return (
    <span className={cn('inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset', TONE_CLASS[meta.tone], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function Panel({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn('card flex min-w-0 flex-col', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line/[.07] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 truncate text-xs text-mute">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-white/5 text-mute">
          <Icon className="size-5" strokeWidth={1.6} />
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-mute">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNotice({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-err/25 bg-err/[.07] px-4 py-3 text-[13px]">
      <div>
        <p className="font-medium text-err">Can’t reach the Obsrv API</p>
        <p className="mt-0.5 text-soft">{error.message}. Start it with <code className="rounded bg-white/10 px-1 font-mono text-xs">npm run dev</code> and make sure Oracle is running.</p>
      </div>
      {onRetry && <button className="btn btn-outline shrink-0" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-mute">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function LiveDot({ active = true, label = 'Live' }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-soft">
      <span className="relative flex size-2">
        {active && <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />}
        <span className={cn('relative inline-flex size-2 rounded-full', active ? 'bg-brand' : 'bg-mute')} />
      </span>
      {label}
    </span>
  );
}

export function Logo({ className, href = '/' }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Obsrv home">
      <span className="grid size-7 place-items-center rounded-lg bg-brand">
        <span className="size-3 rounded-full border-[2.5px] border-[#10130a]" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Obsrv</span>
    </Link>
  );
}
