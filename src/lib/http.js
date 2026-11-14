import { AppError, ValidationError } from './errors.js';

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
}

/** Wraps a route handler so every error becomes a consistent JSON response. */
export async function handle(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) {
      return json({ error: { code: err.code, message: err.message, details: err.details } }, err.status);
    }
    console.error(err);
    return json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server' } }, 500);
  }
}
