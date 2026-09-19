#!/usr/bin/env python3
"""Standalone log generator for Obsrv.

Streams realistic JSON log events every 1-2 seconds and POSTs them to the
Node.js ingestion API.
"""

from __future__ import annotations

import json
import os
import random
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from urllib import request, error

INGESTION_URL = os.getenv('INGESTION_URL', 'http://localhost:4000/api/logs/ingest')

REGIONS = [
    ('US', 'US/Pacific'),
    ('EU', 'Europe/London'),
    ('India', 'Asia/Kolkata'),
    ('Japan', 'Asia/Tokyo'),
]

SERVICES = [
    'auth-service',
    'payment-gateway',
    'checkout-api',
    'db-connector',
    'cache-service',
    'notification-service',
]

MESSAGE_POOLS = {
    'I': [
        'request completed successfully',
        'cache warmup finished',
        'background sync completed',
        'session refreshed for active user',
    ],
    'W': [
        'cache miss rate high',
        'retry budget nearly exhausted',
        'slow query detected on analytics read path',
        'latency above p95 threshold',
    ],
    'E': [
        'database connection timeout',
        'DB connection refused',
        'checkout API not responding',
        'payment gateway timeout',
        'downstream service unavailable',
    ],
    'C': [
        'database connection timeout',
        'DB connection refused',
        'checkout API not responding',
        'payment gateway timeout',
        'authentication outage affecting all tenants',
    ],
}

SERVICE_IMPACTS = {
    'auth-service': 'users may fail to sign in',
    'payment-gateway': 'transactions may be delayed or declined',
    'checkout-api': 'customers may be unable to place orders',
    'db-connector': 'writes may time out',
    'cache-service': 'requests may hit slower paths',
    'notification-service': 'alerts may be delayed',
}


def now_for_region(region_tz: str) -> str:
    return datetime.now(ZoneInfo(region_tz)).isoformat(timespec='milliseconds')


def pick_severity(message: str) -> str:
    lowered = message.lower()
    if 'timeout' in lowered or 'refused' in lowered or 'unavailable' in lowered or 'not responding' in lowered:
        return random.choices(['E', 'C'], weights=[0.7, 0.3])[0]
    if 'slow' in lowered or 'miss rate' in lowered or 'retry budget' in lowered:
        return 'W'
    return 'I'


def build_event() -> dict:
    service = random.choice(SERVICES)
    region_name, region_tz = random.choice(REGIONS)
    message_pool = random.choice(list(MESSAGE_POOLS.values()))
    message = random.choice(message_pool)
    severity = pick_severity(message)
    timestamp = now_for_region(region_tz)

    return {
        'timestamp': timestamp,
        'service': service,
        'region': region_name,
        'severity': severity,
        'message': message,
        'meta': {
            'component': service.replace('-', '_'),
            'request_id': f'req-{random.randint(100000, 999999)}',
            'user_impact': SERVICE_IMPACTS.get(service, 'service impact under review')
        }
    }


def post_event(event: dict) -> None:
    payload = json.dumps(event).encode('utf-8')
    req = request.Request(
        INGESTION_URL,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with request.urlopen(req, timeout=30) as response:
            body = response.read().decode('utf-8')
            print(f"[{response.status}] {event['timestamp']} {event['region']} {event['service']} {event['severity']} {event['message']}\n{body}")
    except error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='ignore')}")
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to post event: {exc}")


def main() -> None:
    print(f'Posting logs to {INGESTION_URL}')
    while True:
        event = build_event()
        post_event(event)
        time.sleep(random.uniform(1.0, 2.0))


if __name__ == '__main__':
    main()
