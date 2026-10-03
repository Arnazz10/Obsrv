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

const demoData = {
  service: 'payment-gateway',
  rows: [
    {
      log_id: 1,
      region_name: 'US',
      local_log_time: '2026-09-20 12:04:10 -07:00',
      severity: 'C',
      user_impact: 'transactions may be delayed or declined',
      message: 'payment gateway timeout',
      payload: { message: 'payment gateway timeout', meta: { user_impact: 'transactions may be delayed or declined' } }
    },
    {
      log_id: 2,
      region_name: 'EU',
      local_log_time: '2026-09-20 20:10:22 +01:00',
      severity: 'E',
      user_impact: 'transactions may be delayed or declined',
      message: 'checkout API not responding',
      payload: { message: 'checkout API not responding', meta: { user_impact: 'transactions may be delayed or declined' } }
    }
  ]
};

export default function ServiceDetailPage() {
  const { service } = useParams();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!service) return;
    getJson(`/api/logs/service/${encodeURIComponent(service)}`)
      .then(setData)
      .catch((err) => {
        setNotice(`Demo mode: ${err.message}`);
        setData(demoData);
      });
  }, [service]);

  if (!data) return <div className="text-slate-400">Loading service logs...</div>;

  return (
    <div className="space-y-6">
      {notice ? <Alert tone="amber">{notice}</Alert> : null}

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
