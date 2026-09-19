import Link from 'next/link';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/search', label: 'Search' },
  { href: '/logs', label: 'Logs' }
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08101f]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <div>
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            Obsrv
          </Link>
          <p className="text-xs text-slate-400">AI observability with Oracle Database 23ai Free</p>
        </div>
        <nav className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
