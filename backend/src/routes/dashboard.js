import { withConnection } from '../lib/db.js';

function mapRows(rows) {
  return rows.map((row) => {
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[key.toLowerCase()] = value;
    }
    return mapped;
  });
}

export async function getSummary(req, res) {
  const data = await withConnection(async (connection) => {
    const regionErrors = await connection.execute(
      `SELECT
         r.region_id,
         r.region_name,
         r.region_tz,
         COUNT(*) AS error_count
       FROM logs l
       JOIN regions r ON r.region_id = l.region_id
       WHERE l.severity IN ('E', 'C')
         AND l.log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
       GROUP BY r.region_id, r.region_name, r.region_tz
       ORDER BY error_count DESC`
    );

    const topServices = await connection.execute(
      `SELECT *
       FROM (
         SELECT
           r.region_name,
           s.service_name,
           COUNT(*) AS error_count,
           RANK() OVER (PARTITION BY r.region_name ORDER BY COUNT(*) DESC) AS region_rank,
           DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS global_rank
         FROM logs l
         JOIN services s ON s.service_id = l.service_id
         JOIN regions r ON r.region_id = l.region_id
         WHERE l.severity IN ('E', 'C')
           AND l.log_time >= SYSTIMESTAMP - INTERVAL '24' HOUR
         GROUP BY r.region_name, s.service_name
       )
       WHERE region_rank <= 5
       ORDER BY region_name, region_rank, service_name`
    );

    const hourlyTrend = await connection.execute(
      `SELECT
         TO_CHAR(hour_start_utc, 'YYYY-MM-DD HH24:00') AS hour_label,
         SUM(error_count) AS error_count
       FROM mv_hourly_errors
       WHERE hour_start_utc >= CAST(SYSTIMESTAMP AT TIME ZONE 'UTC' AS TIMESTAMP) - INTERVAL '24' HOUR
       GROUP BY hour_start_utc
       ORDER BY hour_start_utc`
    );

    const anomalyRows = await connection.execute(
      `WITH hourly AS (
         SELECT
           m.service_id,
           s.service_name,
           r.region_name,
           m.hour_start_utc,
           m.error_count,
           LAG(m.error_count) OVER (PARTITION BY m.service_id ORDER BY m.hour_start_utc) AS prev_hour_count,
           AVG(m.error_count) OVER (
             PARTITION BY m.service_id
             ORDER BY m.hour_start_utc
             ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
           ) AS baseline_avg,
           STDDEV_SAMP(m.error_count) OVER (
             PARTITION BY m.service_id
             ORDER BY m.hour_start_utc
             ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
           ) AS baseline_stddev
         FROM mv_hourly_errors m
         JOIN services s ON s.service_id = m.service_id
         JOIN regions r ON r.region_id = s.region_id
       ), latest AS (
         SELECT *
         FROM hourly
         WHERE hour_start_utc = (SELECT MAX(hour_start_utc) FROM mv_hourly_errors)
       )
       SELECT
         service_id,
         service_name,
         region_name,
         hour_start_utc,
         error_count,
         prev_hour_count,
         baseline_avg,
         baseline_stddev,
         CASE
           WHEN error_count > NVL(baseline_avg + (3 * baseline_stddev), error_count + 1) THEN 'anomaly'
           ELSE 'normal'
         END AS anomaly_state
       FROM latest
       WHERE error_count > NVL(baseline_avg + (3 * baseline_stddev), error_count + 1)
       ORDER BY error_count DESC`
    );

    return {
      regionErrors: mapRows(regionErrors.rows),
      topServices: mapRows(topServices.rows),
      hourlyTrend: mapRows(hourlyTrend.rows),
      anomalies: mapRows(anomalyRows.rows)
    };
  });

  return res.json(data);
}

export async function getAnomalies(req, res) {
  const data = await withConnection(async (connection) => {
    const anomalyRows = await connection.execute(
      `WITH hourly AS (
         SELECT
           m.service_id,
           s.service_name,
           r.region_name,
           m.hour_start_utc,
           m.error_count,
           LAG(m.error_count) OVER (PARTITION BY m.service_id ORDER BY m.hour_start_utc) AS prev_hour_count,
           AVG(m.error_count) OVER (
             PARTITION BY m.service_id
             ORDER BY m.hour_start_utc
             ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
           ) AS baseline_avg,
           STDDEV_SAMP(m.error_count) OVER (
             PARTITION BY m.service_id
             ORDER BY m.hour_start_utc
             ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
           ) AS baseline_stddev
         FROM mv_hourly_errors m
         JOIN services s ON s.service_id = m.service_id
         JOIN regions r ON r.region_id = s.region_id
       ), latest AS (
         SELECT *
         FROM hourly
         WHERE hour_start_utc = (SELECT MAX(hour_start_utc) FROM mv_hourly_errors)
       )
       SELECT
         service_id,
         service_name,
         region_name,
         hour_start_utc,
         error_count,
         prev_hour_count,
         baseline_avg,
         baseline_stddev,
         CASE
           WHEN error_count > NVL(baseline_avg + (3 * baseline_stddev), error_count + 1) THEN 'anomaly'
           ELSE 'normal'
         END AS anomaly_state
       FROM latest
       WHERE error_count > NVL(baseline_avg + (3 * baseline_stddev), error_count + 1)
       ORDER BY error_count DESC`
    );

    return {
      anomalies: mapRows(anomalyRows.rows)
    };
  });

  return res.json(data);
}
