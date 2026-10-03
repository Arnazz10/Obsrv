"use client";

import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert } from '../components/ui/alert';
import { Table, TableCell, TableHead, TableRow } from '../components/ui/table';
import { HourlyTrendChart } from '../components/dashboard/hourly-trend-chart';

function severityTone(severity) {
  if (severity === 'C') return 'darkred';
  if (severity === 'E') return 'red';
  if (severity === 'W') return 'amber';
  return 'blue';
}

function MetricPill({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'from-sky-500/20 to-cyan-500/10 text-sky-200 border-sky-500/20',
    green: 'from-emerald-500/20 to-green-500/10 text-emerald-200 border-emerald-500/20',
    amber: 'from-amber-500/20 to-yellow-500/10 text-amber-200 border-amber-500/20',
    red: 'from-red-500/20 to-rose-500/10 text-red-200 border-red-500/20'
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br px-4 py-3 ${tones[tone] || tones.blue}`}>
      <div className="text-xs uppercase tracking-[0.22em] opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MiniBars({ data }) {
  const colors = ['bg-sky-500', 'bg-cyan-400', 'bg-amber-400'];
  return (
    <div className="flex h-64 items-end justify-between gap-4 px-2 pb-2 pt-4">
      {data.map((item) => (
        <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-44 items-end gap-1.5">
            {item.segments.map((segment, index) => (
              <div key={`${item.day}-${index}`} className={`w-2.5 rounded-full ${colors[index % colors.length]}`} style={{ height: `${segment}%` }} />
            ))}
          </div>
          <div className="text-xs text-slate-300">{item.day}</div>
        </div>
      ))}
    </div>
  );
}

function Gauge({ value }) {
  const progress = Math.max(0, Math.min(100, value));
  const style = {
    background: `conic-gradient(from 200deg, #7fe1e8 0deg 72deg, #1e2c68 72deg 178deg, #f7b924 178deg 265deg, transparent 265deg 360deg)`
  };
  return (
    <div className="relative mx-auto h-52 w-52">
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent opacity-80" style={style} />
      <div className="absolute inset-[18px] rounded-full border border-white/10 bg-[#090d18]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-sm text-slate-400">Saving</div>
        <div className="mt-2 text-4xl font-semibold tracking-tight text-white">$ 21,550</div>
        <div className="mt-3 text-xs text-slate-400">{progress}% of monthly target</div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-5 text-xs text-slate-300">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-300" /> Unallocated</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Sale</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Sport</span>
      </div>
    </div>
  );
}

const demoData = {
  regionErrors: [
    { region_id: 1, region_name: 'US', error_count: 18 },
    { region_id: 2, region_name: 'EU', error_count: 12 },
    { region_id: 3, region_name: 'India', error_count: 9 },
    { region_id: 4, region_name: 'Japan', error_count: 6 }
  ],
  topServices: [
    { region_name: 'US', service_name: 'payment-gateway', error_count: 9, region_rank: 1, global_rank: 1 },
    { region_name: 'EU', service_name: 'checkout-api', error_count: 7, region_rank: 1, global_rank: 2 },
    { region_name: 'India', service_name: 'db-connector', error_count: 5, region_rank: 1, global_rank: 3 }
  ],
  hourlyTrend: [
    { hour_label: '2026-09-20 09:00', error_count: 4 },
    { hour_label: '2026-09-20 10:00', error_count: 7 },
    { hour_label: '2026-09-20 11:00', error_count: 11 },
    { hour_label: '2026-09-20 12:00', error_count: 9 }
  ],
  anomalies: [
    { service_id: 1, service_name: 'payment-gateway', region_name: 'US', hour_start_utc: '2026-09-20 12:00', error_count: 15 }
  ]
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [health, setHealth] = useState({ backend: 'loading', database: 'loading' });

  useEffect(() => {
    getJson('/api/dashboard/summary')
      .then(setData)
      .catch((err) => {
        setNotice(`Demo mode: ${err.message}`);
        setData(demoData);
      });

    getJson('/health')
      .then((result) => {
        setHealth({
          backend: result?.ok ? 'ok' : 'error',
          database: result?.database || 'unknown'
        });
      })
      .catch(() => {
        setHealth({ backend: 'error', database: 'unavailable' });
      });
  }, []);

  const totalErrors = useMemo(() => {
    return data?.regionErrors?.reduce((sum, item) => sum + Number(item.error_count || 0), 0) || 0;
  }, [data]);

  if (!data) {
    return <div className="text-slate-300">Loading dashboard...</div>;
  }

  const activity = [
    { name: 'Cody Fisher', action: 'Deleted 2 items from Group Prime', time: 'Just now' },
    { name: 'Eleanor Pena', action: 'Added 2 items to Group Prime', time: '15 mins ago' },
    { name: 'Jake Black', action: 'Added 2 items to Group Prime', time: '16 mins ago' }
  ];

  const requests = [
    { name: 'Savannah Nguyen', handle: '@savannn', color: 'bg-rose-400' },
    { name: 'Cameron Williamson', handle: '@cameronwill', color: 'bg-sky-400' },
    { name: 'Kristin Watson', handle: '@kris', color: 'bg-indigo-400' }
  ];

  const chartData = [
    { day: 'Mon', segments: [82, 16, 12] },
    { day: 'Tue', segments: [54, 28, 11] },
    { day: 'Wed', segments: [75, 20, 13] },
    { day: 'Thu', segments: [50, 31, 15] },
    { day: 'Fri', segments: [67, 18, 14] }
  ];

  return (
    <div className="space-y-6">
      {notice ? <Alert tone="amber">{notice}</Alert> : null}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="overflow-hidden border-white/10 bg-[#0b1223]/90">
          <CardHeader className="border-white/8 px-5 py-4">
            <CardTitle className="text-base font-medium">Analysis</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5 pt-0">
            <MiniBars data={chartData} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-[#0b1223]/90">
          <CardHeader className="border-white/8 px-5 py-4">
            <CardTitle className="text-base font-medium">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 pt-0">
            {activity.map((item, index) => (
              <div key={item.name} className={index < activity.length - 1 ? 'border-b border-white/8 pb-4' : ''}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.action}</div>
                  </div>
                  <div className="text-xs text-slate-500">{item.time}</div>
                </div>
              </div>
            ))}
            <button className="mt-1 w-full rounded-xl bg-[#1b2d6d] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#223882]">
              View All
            </button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-[#0b1223]/90">
          <CardHeader className="border-white/8 px-5 py-4">
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5 pt-0">
            <Gauge value={72} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricPill label="Frontend" value="Ready" tone="green" />
        <MetricPill label="Backend API" value={health.backend} tone={health.backend === 'ok' ? 'green' : 'red'} />
        <MetricPill label="Oracle DB" value={health.database} tone={health.database === 'connected' ? 'green' : 'amber'} />
        <MetricPill label="Fleet total" value={totalErrors} tone="blue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-white/10 bg-[#0b1223]/90">
          <CardHeader className="flex flex-row items-center justify-between border-white/8 px-5 py-4">
            <div>
              <CardTitle className="text-base font-medium">Purchase</CardTitle>
              <CardDescription>Most recent log activity and region-level trends</CardDescription>
            </div>
            <button className="rounded-xl bg-[#1b2d6d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#223882]">
              New Transaction
            </button>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="mb-4 flex flex-wrap gap-2">
              {['Most Recent', 'All Status', 'Billing'].map((filter) => (
                <button key={filter} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
                  {filter}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <Table>
                <TableHead className="grid-cols-[1.2fr_1.1fr_0.7fr_0.9fr_0.5fr]">
                  <div>User</div>
                  <div>Status</div>
                  <div>Date</div>
                  <div>Amount</div>
                  <div> </div>
                </TableHead>
                {data.topServices.map((row, index) => (
                  <TableRow key={`${row.region_name}-${row.service_name}`} className="grid-cols-[1.2fr_1.1fr_0.7fr_0.9fr_0.5fr] items-center gap-3 border-white/8">
                    <TableCell>
                      <div className="font-medium text-white">{row.service_name}</div>
                      <div className="text-xs text-slate-400">{row.region_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge tone={index === 0 ? 'green' : 'amber'}>{index === 0 ? 'Success' : 'Pending'}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">21 Aug, 2023</TableCell>
                    <TableCell className="text-slate-300">+ $22,124.00</TableCell>
                    <TableCell className="text-right text-slate-400">Detail</TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden border-white/10 bg-[#0b1223]/90">
            <CardHeader className="flex flex-row items-center justify-between border-white/8 px-5 py-4">
              <CardTitle className="text-base font-medium">New Request</CardTitle>
              <button className="text-sm text-slate-400 hover:text-white">View All</button>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-0">
              {requests.map((request) => (
                <div key={request.name} className="flex items-center justify-between gap-3 border-b border-white/8 pb-4 last:border-none last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${request.color}`} />
                    <div>
                      <div className="text-sm font-medium text-white">{request.name}</div>
                      <div className="text-xs text-slate-400">{request.handle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>✕</span>
                    <span>▾</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-600/20 to-indigo-900/40">
            <CardHeader className="border-white/8 px-5 py-4">
              <CardTitle className="text-lg font-semibold text-cyan-200">Explore more feature</CardTitle>
              <CardDescription className="text-sky-100/75">Get Premium today</CardDescription>
            </CardHeader>
            <CardContent className="pb-5 pt-0">
              <button className="rounded-xl border border-sky-300/40 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/10">
                Get Now
              </button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
