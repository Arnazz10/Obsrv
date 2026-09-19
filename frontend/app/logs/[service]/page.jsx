"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getJson } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Alert } from '../../../components/ui/alert';
import { Table, TableCell, TableHead, TableRow } from '../../../components/ui/table';

function severityTone(severity) {
  if (severity === 'C') return 'darkred';
  if (severity === 'E') return 'red';
  if (severity === 'W') return 'amber';
  return 'blue';
}

export default function ServiceDetailPage() {
  const { service } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!service) return;
    getJson(`/api/logs/service/${encodeURIComponent(service)}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [service]);

  if (error) return <Alert tone="red">{error}</Alert>;
  if (!data) return <div className="text-slate-400">Loading service logs...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{data.service}</CardTitle>
          <CardDescription>All logs for one service across regions, with user impact annotations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead className="grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_2fr_1.4fr]">
              <div>Time</div>
              <div>Region</div>
              <div>Severity</div>
              <div>Impact</div>
              <div>Message</div>
              <div>Raw payload</div>
            </TableHead>
            {data.rows.map((row) => (
              <TableRow key={row.LOG_ID || row.log_id} className="grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_2fr_1.4fr] items-start gap-3">
                <TableCell className="text-slate-300">{row.LOCAL_LOG_TIME || row.local_log_time}</TableCell>
                <TableCell>{row.REGION_NAME || row.region_name}</TableCell>
                <TableCell><Badge tone={severityTone(row.SEVERITY || row.severity)}>{row.SEVERITY || row.severity}</Badge></TableCell>
                <TableCell className="text-slate-400">{row.USER_IMPACT || row.user_impact || 'n/a'}</TableCell>
                <TableCell className="text-slate-300">{row.MESSAGE || row.message}</TableCell>
                <TableCell className="text-xs text-slate-500">{JSON.stringify(row.PAYLOAD || row.payload)}</TableCell>
              </TableRow>
            ))}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
