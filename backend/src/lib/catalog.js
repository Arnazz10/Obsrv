// Shared reference data for the seeder, the live simulator and the API.
export const REGIONS = [
  { name: 'US', label: 'United States', tz: 'US/Pacific', city: 'San Francisco', lat: 37.77, lng: -122.42 },
  { name: 'EU', label: 'Europe', tz: 'Europe/London', city: 'London', lat: 51.51, lng: -0.13 },
  { name: 'India', label: 'India', tz: 'Asia/Kolkata', city: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'Japan', label: 'Japan', tz: 'Asia/Tokyo', city: 'Tokyo', lat: 35.68, lng: 139.69 }
];

export const SERVICES = [
  { name: 'auth-service', impact: 'Users may fail to sign in' },
  { name: 'payment-gateway', impact: 'Transactions may be delayed or declined' },
  { name: 'checkout-api', impact: 'Customers may be unable to place orders' },
  { name: 'db-connector', impact: 'Writes may time out' },
  { name: 'cache-service', impact: 'Requests may hit slower paths' },
  { name: 'notification-service', impact: 'Alerts and emails may be delayed' }
];

// Message pools per severity. Per-service flavour is added through SERVICE_MESSAGES.
export const MESSAGES = {
  I: [
    'request completed successfully',
    'cache warmup finished',
    'background sync completed',
    'session refreshed for active user',
    'health check passed',
    'scheduled job finished without errors'
  ],
  W: [
    'cache miss rate high',
    'retry budget nearly exhausted',
    'slow query detected on analytics read path',
    'latency above p95 threshold',
    'connection pool utilisation above 80 percent',
    'memory usage approaching configured limit'
  ],
  E: [
    'downstream service unavailable',
    'upstream returned 502 bad gateway',
    'database connection timeout'
  ],
  C: [
    'downstream service unavailable for all requests',
    'database connection timeout'
  ]
};

export const SERVICE_MESSAGES = {
  'auth-service': {
    E: ['failed to refresh authentication token', 'identity provider unavailable'],
    C: ['authentication outage affecting all tenants']
  },
  'payment-gateway': {
    E: ['payment gateway timeout', 'card processor returned repeated declines'],
    C: ['payment gateway timeout']
  },
  'checkout-api': {
    E: ['checkout API not responding', 'order submission failed after retries'],
    C: ['checkout API not responding for all requests']
  },
  'db-connector': {
    E: ['database connection timeout', 'DB connection refused'],
    C: ['primary database unreachable, failover in progress']
  },
  'cache-service': {
    W: ['cache miss rate high', 'eviction rate above baseline'],
    E: ['cache node unreachable', 'replication lag exceeded limit'],
    C: ['cache cluster unreachable, requests falling back to database']
  },
  'notification-service': {
    W: ['retry budget nearly exhausted'],
    E: ['upstream returned 502 bad gateway', 'email provider rejected batch'],
    C: ['notification queue full, messages being dropped']
  }
};

const SEVERITY_WEIGHTS = { I: 0.7, W: 0.15, E: 0.12, C: 0.03 };

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function pickSeverity(weights = SEVERITY_WEIGHTS) {
  const roll = Math.random();
  let acc = 0;
  for (const [severity, weight] of Object.entries(weights)) {
    acc += weight;
    if (roll <= acc) return severity;
  }
  return 'I';
}

export function messageFor(service, severity) {
  const own = SERVICE_MESSAGES[service]?.[severity];
  const pool = own && Math.random() < 0.9 ? own : MESSAGES[severity];
  return pick(pool);
}

export function buildEvent({ region = pick(REGIONS), service = pick(SERVICES), severity, timestamp = new Date(), weights } = {}) {
  const sev = severity || pickSeverity(weights);
  return {
    timestamp: timestamp.toISOString().replace('Z', '+00:00'),
    service: service.name,
    region: region.name,
    severity: sev,
    message: messageFor(service.name, sev),
    meta: {
      component: service.name.replace(/-/g, '_'),
      request_id: `req-${Math.floor(100000 + Math.random() * 900000)}`,
      host: `${service.name.split('-')[0]}-${region.name.toLowerCase()}-${1 + Math.floor(Math.random() * 4)}`,
      user_impact: service.impact
    }
  };
}
