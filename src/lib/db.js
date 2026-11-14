import pg from 'pg';

// One connection pool per server instance. Stored on globalThis so that
// Next.js hot reload in development does not open a new pool on every change.
function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new pg.Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

export function getPool() {
  if (!globalThis.__dukaanPool) {
    globalThis.__dukaanPool = createPool();
  }
  return globalThis.__dukaanPool;
}

export function query(text, params) {
  return getPool().query(text, params);
}

/** Runs fn(client) inside BEGIN/COMMIT, rolling back on any error. */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (globalThis.__dukaanPool) {
    await globalThis.__dukaanPool.end();
    globalThis.__dukaanPool = undefined;
  }
}
