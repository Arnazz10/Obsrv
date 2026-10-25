"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Overview', icon: '▦' },
  { href: '/logs', label: 'Security events', icon: '≡' },
  { href: '/search', label: 'Threat search', icon: '⌕' }
];

export function AppShell({ children }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <header className="topbar">
      <Link href="/" className="brand"><span className="brand-mark">◈</span><span>OBSRV<span className="brand-sub">SECURITY OPERATIONS</span></span></Link>
      <nav className="top-nav" aria-label="Primary navigation">{items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? 'page' : undefined} className={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? 'active' : ''}><span>{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="topbar-right"><span className="top-status"><i/> API monitored</span><span className="top-divider"/><span className="user-avatar">A</span><span className="user-name">Workspace</span></div>
    </header>
    <main className="app-main">{children}</main>
    <footer className="app-footer"><span>OBSRV · OBSERVABILITY CONSOLE</span><span>Live data from configured backend</span></footer>
  </div>;
}
