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
    return <div className="text-slate-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {notice ? <Alert tone="amber">{notice}</Alert> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Frontend</CardDescription>
            <CardTitle className="text-3xl text-emerald-300">Ready</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">Next.js app is serving the observability UI.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Backend API</CardDescription>
            <CardTitle className="text-3xl capitalize">{health.backend}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">Express API health check and data endpoints.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Oracle database</CardDescription>
            <CardTitle className="text-3xl capitalize">{health.database}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">Connection state reported by the backend health endpoint.</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {data.regionErrors.map((region) => (
          <Card key={region.region_id}>
            <CardHeader>
              <CardDescription>{region.region_name}</CardDescription>
              <CardTitle className="text-3xl">{region.error_count}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-400">Errors in the last 24 hours</CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardDescription>Fleet total</CardDescription>
            <CardTitle className="text-3xl">{totalErrors}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">Critical and error events</CardContent>
        </Card>
      </section>

      {data.anomalies.length > 0 ? (
        <Alert tone="red">
          Anomaly detected for {data.anomalies[0].service_name} in {data.anomalies[0].region_name}: current hour error volume is above the 3σ baseline.
        </Alert>
      ) : (
        <Alert tone="blue">No anomaly spikes detected in the latest hourly window.</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hourly error trend</CardTitle>
          <CardDescription>Aggregated from the Oracle materialized view</CardDescription>
        </CardHeader>
        <CardContent>
          <HourlyTrendChart data={data.hourlyTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top failing services</CardTitle>
          <CardDescription>Ranked by region using analytic functions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead className="grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_0.7fr]">
              <div>Region</div>
              <div>Service</div>
              <div>Errors</div>
              <div>Region Rank</div>
              <div>Global Rank</div>
            </TableHead>
            {data.topServices.map((row) => (
              <TableRow key={`${row.region_name}-${row.service_name}`} className="grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_0.7fr] items-center">
                <TableCell>{row.region_name}</TableCell>
                <TableCell>{row.service_name}</TableCell>
                <TableCell>{row.error_count}</TableCell>
                <TableCell>{row.region_rank}</TableCell>
                <TableCell>{row.global_rank}</TableCell>
              </TableRow>
            ))}
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest anomaly flags</CardTitle>
          <CardDescription>Service-level baseline comparison with LAG and rolling statistics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.anomalies.length === 0 ? (
            <div className="text-sm text-slate-400">No anomalous services right now.</div>
          ) : (
            data.anomalies.map((row) => (
              <div key={`${row.service_id}-${row.hour_start_utc}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/8 px-4 py-3">
                <div>
                  <div className="font-medium text-white">{row.service_name}</div>
                  <div className="text-sm text-slate-400">{row.region_name} • {row.hour_start_utc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={severityTone('C')}>Spike</Badge>
                  <span className="text-sm text-slate-300">Count {row.error_count}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
