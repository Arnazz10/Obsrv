"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: '◫' },
  { href: '/search', label: 'Search', icon: '⌕' },
  { href: '/logs', label: 'Logs', icon: '≣' }
];

function isActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

function ShellButton({ label, icon }) {
  return (
    <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">
      <span className="text-sm">{icon}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(77,163,255,0.12),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(74,222,128,0.09),_transparent_18%),linear-gradient(180deg,#0a1020_0%,#060913_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 p-4 lg:p-6">
        <aside className="hidden w-64 shrink-0 flex-col rounded-[28px] border border-white/10 bg-black/55 px-5 py-6 shadow-2xl shadow-black/30 backdrop-blur xl:flex">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-lg font-black text-white shadow-lg shadow-sky-500/20">
              O
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">Obsrv</div>
              <div className="text-xs text-slate-400">Oracle observability suite</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active ? 'bg-[#132454] text-white shadow-lg shadow-sky-900/20' : 'text-slate-300 hover:bg-white/7 hover:text-white'
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/8 text-xs text-slate-300">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 px-2 pb-2">
            <div className="rounded-3xl border border-sky-500/15 bg-sky-500/10 p-4 text-sm text-sky-100">
              <div className="text-xs uppercase tracking-[0.24em] text-sky-300/80">Database</div>
              <div className="mt-2 text-lg font-semibold">Oracle 23ai</div>
              <div className="mt-1 text-xs text-sky-100/75">Live connection with vector search enabled.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
              Built for local development and demo presentation.
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-[28px] border border-white/10 bg-black/55 px-4 py-4 shadow-2xl shadow-black/30 backdrop-blur lg:px-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-slate-400">⌕</span>
                <input
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Search logs, services, regions..."
                />
              </div>
              <div className="flex items-center gap-2">
                <ShellButton label="Notifications" icon="◌" />
                <ShellButton label="Settings" icon="⚙" />
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="h-9 w-9 rounded-full bg-[url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&q=80')] bg-cover bg-center" />
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-white">Arnab</div>
                    <div className="text-xs text-slate-400">System admin</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 rounded-[28px] border border-white/10 bg-black/40 p-4 shadow-2xl shadow-black/25 backdrop-blur lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}