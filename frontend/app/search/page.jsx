"use client";

import { useState } from 'react';
import { getJson } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert } from '../../components/ui/alert';

function severityTone(severity) {
  if (severity === 'C') return 'darkred';
  if (severity === 'E') return 'red';
  if (severity === 'W') return 'amber';
  return 'blue';
}

const demoResults = [
  {
    log_id: 1,
    service_name: 'payment-gateway',
    region_name: 'US',
    local_log_time: '2026-09-20 12:04:10 -07:00',
    severity: 'C',
    message: 'payment gateway timeout',
    distance: 0.0312,
    similarity: 0.9688
  },
  {
    log_id: 2,
    service_name: 'checkout-api',
    region_name: 'EU',
    local_log_time: '2026-09-20 20:10:22 +01:00',
    severity: 'E',
    message: 'checkout API not responding',
    distance: 0.0421,
    similarity: 0.9579
  }
];

export default function SearchPage() {
  const [query, setQuery] = useState('database connection timeout');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runSearch(value = query) {
    setLoading(true);
    setError('');
    try {
      const data = await getJson('/api/logs/search?q=' + encodeURIComponent(value));
      setResults(data.results || []);
    } catch (err) {
      setError(`Demo mode: ${err.message}`);
      setResults(demoResults);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Semantic log search</CardTitle>
          <CardDescription>Type an incident pattern and query the Oracle vector index.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="payment gateway timeout" />
          <Button onClick={() => runSearch()} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </CardContent>
      </Card>

      <Button variant="secondary" onClick={() => runSearch('database connection timeout')} disabled={loading}>
        Try a sample query
      </Button>

      {error ? <Alert tone="red">{error}</Alert> : null}

      {results.length === 0 ? <Alert tone="blue">Run a search to see semantically similar logs.</Alert> : null}

      <div className="grid gap-4">
        {results.map((row) => (
          <Card key={row.LOG_ID || row.log_id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{row.MESSAGE || row.message}</CardTitle>
                  <CardDescription>
                    {row.SERVICE_NAME || row.service_name} • {row.REGION_NAME || row.region_name} • {row.LOCAL_LOG_TIME || row.local_log_time}
                  </CardDescription>
                </div>
                <Badge tone={severityTone(row.SEVERITY || row.severity)}>{row.SEVERITY || row.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-slate-400">
              <span>Distance {Number(row.DISTANCE ?? row.distance ?? 0).toFixed(4)}</span>
              <span>Similarity {Number(row.SIMILARITY ?? row.similarity ?? 0).toFixed(4)}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
