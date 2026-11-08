'use client';

import { useEffect, useState } from 'react';
import { useNow } from '../lib/hooks';

const REGIONS = [
  { name: 'US', city: 'San Francisco', tz: 'America/Los_Angeles', abbr: 'PT' },
  { name: 'EU', city: 'London', tz: 'Europe/London', abbr: 'GMT' },
  { name: 'India', city: 'Mumbai', tz: 'Asia/Kolkata', abbr: 'IST' },
  { name: 'Japan', city: 'Tokyo', tz: 'Asia/Tokyo', abbr: 'JST' }
];

export function RegionClocks({ stats = [] }) {
  const now = useNow(1000);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const byName = new Map(stats.map((s) => [s.region_name, s]));
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line/[.08] bg-line/[.08] sm:grid-cols-2 lg:grid-cols-4">
      {REGIONS.map((r) => {
        const time = mounted ? new Date(now).toLocaleTimeString('en-GB', { timeZone: r.tz, hour12: false }) : '--:--:--';
        const s = byName.get(r.name);
        return (
          <a key={r.name} href={`/logs?region=${r.name}`} className="group bg-bg p-6 transition-colors hover:bg-panel">
            <p className="label">{r.city}</p>
            <p className="num mt-3 font-mono text-3xl font-medium tracking-tight">{time}</p>
            <p className="mt-1 text-xs text-mute">{r.name} · {r.abbr}</p>
            <p className="num mt-5 text-[13px] text-soft">{s ? `${s.events.toLocaleString()} events · ${s.error_count} errors / 24h` : 'Waiting for data'}</p>
          </a>
        );
      })}
    </div>
  );
}
