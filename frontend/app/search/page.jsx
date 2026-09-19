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
      setError(err.message);
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
