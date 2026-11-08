'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TONE_HEX } from '../lib/format';

function hourLabel(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(' ', '').toLowerCase();
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-line/10 bg-raised/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium">{new Date(row.hour_start).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p>
      {[['critical', 'Critical', TONE_HEX.crit], ['errors', 'Error', TONE_HEX.err], ['warnings', 'Warning', TONE_HEX.warn]].map(([key, label, color]) => (
        <p key={key} className="flex items-center justify-between gap-6 text-soft">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: color }} />{label}</span>
          <span className="num text-ink">{row[key]}</span>
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data = [], height = 220 }) {
  return (
    <div style={{ height }} className="px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
          <XAxis dataKey="hour_start" tickFormatter={hourLabel} interval={3} tickLine={false} axisLine={false} tick={{ fill: '#7c828d', fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#7c828d', fontSize: 11 }} width={44} />
          <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
          <Bar dataKey="warnings" stackId="s" fill={TONE_HEX.warn} isAnimationActive={false} />
          <Bar dataKey="errors" stackId="s" fill={TONE_HEX.err} isAnimationActive={false} />
          <Bar dataKey="critical" stackId="s" fill={TONE_HEX.crit} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
