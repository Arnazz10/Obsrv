import Link from 'next/link';
import { Logo } from '../../components/ui';

const LINKS = [['Product', '/#product'], ['Why one database', '/#stack'], ['How it works', '/#how'], ['Regions', '/#regions']];

export default function SiteLayout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/[.06] bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Site">
            {LINKS.map(([label, href]) => (
              <a key={href} href={href} className="rounded-md px-3 py-1.5 text-[13px] text-soft transition-colors hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/search" className="btn btn-ghost hidden sm:inline-flex">Threat Search</Link>
            <Link href="/overview" className="btn btn-solid">Open console</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-line/[.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
          <div>
            <Logo />
            <p className="mt-2 max-w-xs text-xs text-mute">Log observability on a single Oracle Database 23ai. Built for the Advanced SQL course.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-soft" aria-label="Console">
            <Link href="/overview" className="hover:text-ink">Overview</Link>
            <Link href="/logs" className="hover:text-ink">Security Events</Link>
            <Link href="/search" className="hover:text-ink">Threat Search</Link>
            <Link href="/incidents" className="hover:text-ink">Incidents</Link>
            <a href="https://github.com/Arnazz10/Obsrv" className="hover:text-ink">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
