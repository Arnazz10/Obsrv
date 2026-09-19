"use client";

import { useEffect, useState } from 'react';
import { getJson } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Alert } from '../../components/ui/alert';
import { Table, TableCell, TableHead, TableRow } from '../../components/ui/table';
import Link from 'next/link';

function severityTone(severity) {
  if (severity === 'C') return 'darkred';
  if (severity === 'E') return 'red';
  if (severity === 'W') return 'amber';
  return 'blue';
}

export default function LogsPage() {
  const [filters, setFilters] = useState({ region: '', service: '', severity: '', from: '', to: '' });
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadLogs(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(nextFilters)) {
        if (!value) continue;
        if (key === 'from' || key === 'to') {
          params.set(key, new Date(value).toISOString());
        } else {
          params.set(key, value);
        }
      }
      const data = await getJson(`/api/logs${params.toString() ? `?${params.toString()}` : ''}`);
      setRows(data.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log browser</CardTitle>
          <CardDescription>Filter logs by region, service, severity, and date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <Input placeholder="Region" value={filters.region} onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))} />
          <Input placeholder="Service" value={filters.service} onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value }))} />
          <Select value={filters.severity} onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}>
            <option value="">Severity</option>
            <option value="I">Info</option>
            <option value="W">Warning</option>
            <option value="E">Error</option>
            <option value="C">Critical</option>
          </Select>
          <Input type="datetime-local" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} />
          <Input type="datetime-local" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} />
          <Button onClick={() => loadLogs()} disabled={loading}>{loading ? 'Loading...' : 'Apply filters'}</Button>
        </CardContent>
      </Card>

      {error ? <Alert tone="red">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent logs</CardTitle>
          <CardDescription>All timestamps are already converted to each region's local timezone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead className="grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr_2fr]">
              <div>Time</div>
              <div>Service</div>
              <div>Region</div>
              <div>Severity</div>
              <div>Message</div>
            </TableHead>
            {rows.map((row) => (
              <TableRow key={row.LOG_ID || row.log_id} className="grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr_2fr] items-center gap-3">
                <TableCell className="text-slate-300">{row.LOCAL_LOG_TIME || row.local_log_time}</TableCell>
                <TableCell>
                  <Link href={`/logs/${encodeURIComponent(row.SERVICE_NAME || row.service_name)}`} className="text-sky-300 hover:text-sky-200">
                    {row.SERVICE_NAME || row.service_name}
                  </Link>
                </TableCell>
                <TableCell>{row.REGION_NAME || row.region_name}</TableCell>
                <TableCell><Badge tone={severityTone(row.SEVERITY || row.severity)}>{row.SEVERITY || row.severity}</Badge></TableCell>
                <TableCell className="text-slate-400">{row.MESSAGE || row.message}</TableCell>
              </TableRow>
            ))}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
