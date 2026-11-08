'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BellRing, LayoutDashboard, ScrollText, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLive } from '../lib/hooks';
import { LiveDot, Logo } from './ui';
import { NotificationBell, StatusBanner } from './notifications';

const NAV = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/logs', label: 'Security Events', icon: ScrollText },
  { href: '/search', label: 'Threat Search', icon: Sparkles },
  { href: '/incidents', label: 'Alerts & Comms', icon: BellRing }
];

function ApiStatus() {
  const { data, error } = useLive('/health', { interval: 10000 });
  const online = Boolean(data?.ok) && !error;
  return (
    <div className="rounded-lg border border-line/[.07] bg-white/[.02] p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-soft">Oracle 23ai</span>
        <LiveDot active={online} label={online ? 'Connected' : error ? 'Offline' : 'Checking'} />
      </div>
      {online && <p className="mt-1.5 text-mute">Embeddings · {data.embeddings}</p>}
    </div>
  );
}

export function ConsoleShell({ children }) {
  const pathname = usePathname();
  const isActive = (href) => pathname === href || (href !== '/overview' && pathname.startsWith(href));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 hidden h-screen flex-col border-r border-line/[.07] bg-bg px-3 py-4 lg:flex">
        <div className="flex items-center justify-between"><Logo className="px-2" /><NotificationBell /></div>
        <nav className="mt-8 flex flex-col gap-0.5" aria-label="Primary">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                isActive(href) ? 'bg-white/[.07] text-ink' : 'text-soft hover:bg-white/[.04] hover:text-ink'
              )}
            >
              <Icon className={cn('size-4', isActive(href) ? 'text-brand' : 'text-mute')} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <ApiStatus />
          <Link href="/" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-mute transition-colors hover:bg-white/[.04] hover:text-ink">
            <Activity className="size-4" strokeWidth={1.8} /> Back to site
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <StatusBanner />
        <header className="sticky top-0 z-30 border-b border-line/[.07] bg-bg/90 backdrop-blur lg:hidden">
          <div className="flex h-12 items-center justify-between px-4">
            <Logo />
            <NotificationBell align="right" />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Primary">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className={cn('shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium', isActive(href) ? 'bg-white/[.08] text-ink' : 'text-mute')}>{label}</Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
