import { query } from '@/lib/db';

// Used by the pipeline after every deployment, and by Docker's HEALTHCHECK.
// Returns 200 only if the app is running AND the database answers.
export async function GET() {
  const startedAt = Date.now();
  const body = {
    status: 'ok',
    version: process.env.APP_VERSION ?? 'dev',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    database: 'ok',
    time: new Date().toISOString(),
  };
  try {
    await query('SELECT 1');
  } catch (err) {
    console.error('Health check database error:', err.message);
    body.status = 'error';
    body.database = 'unreachable';
  }
  body.responseMs = Date.now() - startedAt;
  return Response.json(body, { status: body.status === 'ok' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
