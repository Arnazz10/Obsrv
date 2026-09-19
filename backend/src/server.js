import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getPool, shutdownPool } from './lib/db.js';
import { ingestLog, searchLogs, browseLogs, getLogsByService } from './routes/logs.js';
import { getSummary, getAnomalies } from './routes/dashboard.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(helmet());
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', async (_req, res) => {
  try {
    await getPool();
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/logs/ingest', ingestLog);
app.get('/api/logs/search', searchLogs);
app.get('/api/logs', browseLogs);
app.get('/api/logs/service/:service', getLogsByService);
app.get('/api/dashboard/summary', getSummary);
app.get('/api/dashboard/anomalies', getAnomalies);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

const server = app.listen(port, async () => {
  await getPool();
  console.log(`Obsrv backend listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await shutdownPool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
