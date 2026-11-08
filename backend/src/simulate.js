// Live traffic simulator: posts one JSON log event per interval to the ingestion API.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { buildEvent } from './lib/catalog.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const url = process.env.INGESTION_URL || 'http://localhost:4000/api/logs/ingest';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Simulating live logs -> ${url}`);
for (;;) {
  const event = buildEvent();
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
    if (!res.ok) console.log(`ingest ${res.status}`);
  } catch (error) {
    console.log(`waiting for API (${error.cause?.code || error.message})`);
    await sleep(3000);
  }
  await sleep(800 + Math.random() * 1400);
}
