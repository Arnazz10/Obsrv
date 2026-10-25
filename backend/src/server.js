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

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get('/health', asyncRoute(async (_req, res) => {
  try {
    const pool = await getPool();
    const connection = await pool.getConnection();
    try {
      await connection.execute('SELECT 1 FROM dual');
    } finally {
      await connection.close();
    }
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'unavailable', error: error.message });
  }
}));

app.post('/api/logs/ingest', asyncRoute(ingestLog));
app.get('/api/logs/search', asyncRoute(searchLogs));
app.get('/api/logs', asyncRoute(browseLogs));
app.get('/api/logs/service/:service', asyncRoute(getLogsByService));
app.get('/api/dashboard/summary', asyncRoute(getSummary));
app.get('/api/dashboard/anomalies', asyncRoute(getAnomalies));

app.use((error, _req, res, _next) => {
  console.error(error);
  const unavailable = error.code === 'NJS-503' || error.code === 'ORA-12541';
  res.status(unavailable ? 503 : 500).json({
    error: error.message || 'Internal server error',
    ...(unavailable ? { database: 'unavailable' } : {})
  });
});

const server = app.listen(port, () => {
  getPool().catch((error) => console.error('Oracle pool initialization failed:', error.message));
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
