'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLive, useNow } from '../../../../lib/hooks';
import { integer } from '../../../../lib/format';
import { ErrorNotice, LiveDot, PageHeader, Panel } from '../../../../components/ui';
import { LogDrawer, LogTable } from '../../../../components/log-views';

export default function ServicePage() {
  const { service: raw } = useParams();
  const service = decodeURIComponent(raw);
  const [open, setOpen] = useState('');
  const now = useNow(5000);
  const { data, error, loading, refresh } = useLive(`/api/logs/service/${encodeURIComponent(service)}`, { interval: 4000 });

  return (
    <Suspense fallback={null}>
      <Link href="/overview" className="mb-4 inline-flex items-center gap-1.5 text-xs text-mute hover:text-ink"><ArrowLeft className="size-3.5" /> Overview</Link>
      <PageHeader title={service} description="Latest 500 events for this service across all regions.">
        <LiveDot />
      </PageHeader>
      <ErrorNotice error={error && !data ? error : null} onRetry={refresh} />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(data?.byRegion || []).map((r) => (
          <Link key={r.region_name} href={`/logs?service=${encodeURIComponent(service)}&region=${r.region_name}`} className="card p-4 transition-colors hover:bg-raised">
            <p className="label">{r.region_name} · 24h</p>
            <p className="num mt-2 text-2xl font-semibold">{integer(r.errors)} <span className="text-sm font-normal text-mute">errors</span></p>
            <p className="num mt-1 text-xs text-mute">{integer(r.total)} events total</p>
          </Link>
        ))}
      </div>

      <Panel title="Event history" description={data ? `${data.rows.length} events` : undefined}>
        <LogTable rows={data?.rows} loading={loading} now={now} showService={false} selectedId={Number(open)} onOpen={setOpen} emptyBody="No events have been recorded for this service." />
      </Panel>
      <LogDrawer id={open} onClose={() => setOpen('')} onOpen={setOpen} />
    </Suspense>
  );
}
