import { withConnection } from '../lib/db.js';
import { REGIONS, SERVICES } from '../lib/catalog.js';
import { lowerKeys } from './logs.js';

const mapRows = (rows) => rows.map(lowerKeys);

const ANOMALY_SQL = `
  WITH hourly AS (
    SELECT
      m.service_id,
      s.service_name,
      r.region_name,
      m.hour_start_utc,
      m.error_count,
      LAG(m.error_count) OVER (PARTITION BY m.service_id ORDER BY m.hour_start_utc) AS prev_hour_count,
      AVG(m.error_count) OVER (
        PARTITION BY m.service_id ORDER BY m.hour_start_utc
        ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
      ) AS baseline_avg,
      STDDEV_SAMP(m.error_count) OVER (
        PARTITION BY m.service_id ORDER BY m.hour_start_utc
        ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
      ) AS baseline_stddev
    FROM mv_hourly_errors m
    JOIN services s ON s.service_id = m.service_id
    JOIN regions r ON r.region_id = s.region_id
  ), latest AS (
    SELECT * FROM hourly
    WHERE hour_start_utc >= (SELECT MAX(hour_start_utc) FROM mv_hourly_errors) - INTERVAL '1' HOUR
  )
  SELECT
    service_id, service_name, region_name,
    TO_CHAR(hour_start_utc, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS hour_start_utc,
    error_count, prev_hour_count, baseline_avg, baseline_stddev,
    CASE WHEN baseline_stddev IS NULL OR baseline_stddev = 0
         THEN error_count / NULLIF(baseline_avg, 0)
         ELSE (error_count - baseline_avg) / baseline_stddev END AS score
  FROM latest
  WHERE baseline_avg IS NOT NULL
    AND error_count > baseline_avg + (3 * NVL(baseline_stddev, 0))
    AND error_count >= 5
  ORDER BY error_count DESC`;

async function loadAnomalies(connection) {
  const result = await connection.execute(ANOMALY_SQL);
  return mapRows(result.rows);
}

export async function getSummary(_req, res) {
  const data = await withConnection(async (connection) => {
    const kpiRow = await connection.execute(
      `SELECT
         COUNT(*) AS events_24h,
         SUM(CASE WHEN severity IN ('E','C') THEN 1 ELSE 0 END) AS errors_24h,
         SUM(CASE WHEN severity = 'C' THEN 1 ELSE 0 END) AS critical_24h,
         SUM(CASE WHEN severity = 'W' THEN 1 ELSE 0 END) AS warnings_24h,
         SUM(CASE WHEN log_time >= SYSTIMESTAMP - INTERVAL '1' HOUR AND severity IN ('E','C') THEN 1 ELSE 0 END) AS errors_1h,
         SUM(CASE WHEN log_time >= SYSTIMESTAMP - INTERVAL '5' MINUTE THEN 1 ELSE 0 END) AS events_5m,
         COUNT(DISTINCT service_id) AS active_services
       FROM logs
       WHERE log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR`
    );
    const prevRow = await connection.execute(
      `SELECT
         SUM(CASE WHEN severity IN ('E','C') THEN 1 ELSE 0 END) AS errors_prev,
         SUM(CASE WHEN severity = 'C' THEN 1 ELSE 0 END) AS critical_prev
       FROM logs
       WHERE log_time >= SYSTIMESTAMP - INTERVAL '48' HOUR AND log_time < SYSTIMESTAMP - INTERVAL '24' HOUR`
    );

    const regionStats = await connection.execute(
      `SELECT
         r.region_name,
         COUNT(*) AS events,
         SUM(CASE WHEN l.severity IN ('E','C') THEN 1 ELSE 0 END) AS error_count,
         SUM(CASE WHEN l.severity = 'C' THEN 1 ELSE 0 END) AS critical_count,
         SUM(CASE WHEN l.severity = 'W' THEN 1 ELSE 0 END) AS warning_count,
         SUM(CASE WHEN l.severity IN ('E','C') AND l.log_time >= SYSTIMESTAMP - INTERVAL '1' HOUR THEN 1 ELSE 0 END) AS errors_1h
       FROM logs l
       JOIN regions r ON r.region_id = l.region_id
       WHERE l.log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
       GROUP BY r.region_name`
    );

    const services = await connection.execute(
      `SELECT
         s.service_name,
         COUNT(*) AS events,
         SUM(CASE WHEN l.severity IN ('E','C') THEN 1 ELSE 0 END) AS error_count,
         SUM(CASE WHEN l.severity = 'C' THEN 1 ELSE 0 END) AS critical_count,
         SUM(CASE WHEN l.severity IN ('E','C') AND l.log_time >= SYSTIMESTAMP - INTERVAL '1' HOUR THEN 1 ELSE 0 END) AS errors_1h,
         DENSE_RANK() OVER (ORDER BY SUM(CASE WHEN l.severity IN ('E','C') THEN 1 ELSE 0 END) DESC) AS error_rank
       FROM logs l
       JOIN services s ON s.service_id = l.service_id
       WHERE l.log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
       GROUP BY s.service_name
       ORDER BY error_count DESC`
    );

    const topServices = await connection.execute(
      `SELECT * FROM (
         SELECT
           r.region_name, s.service_name,
           COUNT(*) AS error_count,
           RANK() OVER (PARTITION BY r.region_name ORDER BY COUNT(*) DESC) AS region_rank
         FROM logs l
         JOIN services s ON s.service_id = l.service_id
         JOIN regions r ON r.region_id = l.region_id
         WHERE l.severity IN ('E', 'C') AND l.log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
         GROUP BY r.region_name, s.service_name
       ) WHERE region_rank <= 3
       ORDER BY region_name, region_rank, service_name`
    );

    const hourly = await connection.execute(
      `SELECT
         TO_CHAR(TRUNC(CAST(log_time AT TIME ZONE 'UTC' AS TIMESTAMP), 'HH'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS hour_start,
         COUNT(*) AS total,
         SUM(CASE WHEN severity = 'W' THEN 1 ELSE 0 END) AS warnings,
         SUM(CASE WHEN severity = 'E' THEN 1 ELSE 0 END) AS errors,
         SUM(CASE WHEN severity = 'C' THEN 1 ELSE 0 END) AS critical
       FROM logs
       WHERE log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
       GROUP BY TRUNC(CAST(log_time AT TIME ZONE 'UTC' AS TIMESTAMP), 'HH')
       ORDER BY 1`
    );

    const anomalies = await loadAnomalies(connection);
    const kpi = lowerKeys(kpiRow.rows[0]);
    const prev = lowerKeys(prevRow.rows[0]);

    // Fill hours with no events so the chart always spans a full 24 hours.
    const byHour = new Map(mapRows(hourly.rows).map((row) => [row.hour_start, row]));
    const hourlyTrend = [];
    const top = new Date();
    top.setUTCMinutes(0, 0, 0);
    for (let i = 23; i >= 0; i -= 1) {
      const key = new Date(top.getTime() - i * 3600_000).toISOString().replace(/\.\d+Z$/, 'Z');
      const row = byHour.get(key);
      hourlyTrend.push({
        hour_start: key,
        total: Number(row?.total || 0),
        warnings: Number(row?.warnings || 0),
        errors: Number(row?.errors || 0),
        critical: Number(row?.critical || 0)
      });
    }

    const statsByRegion = new Map(mapRows(regionStats.rows).map((row) => [row.region_name, row]));
    const regionErrors = REGIONS.map((region) => {
      const row = statsByRegion.get(region.name) || {};
      return {
        region_name: region.name,
        label: region.label,
        city: region.city,
        lat: region.lat,
        lng: region.lng,
        region_tz: region.tz,
        events: Number(row.events || 0),
        error_count: Number(row.error_count || 0),
        critical_count: Number(row.critical_count || 0),
        warning_count: Number(row.warning_count || 0),
        errors_1h: Number(row.errors_1h || 0)
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        events24h: Number(kpi.events_24h || 0),
        errors24h: Number(kpi.errors_24h || 0),
        critical24h: Number(kpi.critical_24h || 0),
        warnings24h: Number(kpi.warnings_24h || 0),
        errors1h: Number(kpi.errors_1h || 0),
        events5m: Number(kpi.events_5m || 0),
        activeServices: Number(kpi.active_services || 0),
        errorsPrev24h: Number(prev.errors_prev || 0),
        criticalPrev24h: Number(prev.critical_prev || 0),
        anomalyCount: anomalies.length
      },
      regionErrors,
      services: mapRows(services.rows),
      topServices: mapRows(topServices.rows),
      hourlyTrend,
      anomalies
    };
  });

  return res.json(data);
}

export async function getAnomalies(_req, res) {
  const anomalies = await withConnection(loadAnomalies);
  return res.json({ anomalies });
}

export async function getMeta(_req, res) {
  const data = await withConnection(async (connection) => {
    const services = await connection.execute('SELECT DISTINCT service_name FROM services ORDER BY service_name');
    const regions = await connection.execute('SELECT region_name FROM regions ORDER BY region_name');
    return {
      services: services.rows.map((r) => r.SERVICE_NAME),
      regions: regions.rows.map((r) => r.REGION_NAME)
    };
  });
  return res.json({
    ...data,
    regionCatalog: REGIONS,
    serviceCatalog: SERVICES.map((s) => s.name)
  });
}
