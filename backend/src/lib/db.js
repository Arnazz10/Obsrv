import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

let poolPromise;

export const oracleConfig = {
  user: process.env.ORACLE_USER || 'system',
  password: process.env.ORACLE_PASSWORD || 'YourPass123',
  connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/FREEPDB1',
  poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
  poolMax: Number(process.env.ORACLE_POOL_MAX || 10),
  poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT || 1)
};

export async function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool(oracleConfig);
  }
  return poolPromise;
}

export async function withConnection(fn) {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    await connection.execute(`
      ALTER SESSION SET
        NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS',
        NLS_TIMESTAMP_TZ_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF3 TZH:TZM'
    `);
    return await fn(connection);
  } finally {
    await connection.close();
  }
}

export async function shutdownPool() {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close(10);
    poolPromise = undefined;
  }
}
