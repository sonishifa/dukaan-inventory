'use client';

export default function Error({ reset }) {
  return (
    <div className="panel">
      <h1>This page could not load</h1>
      <p className="muted">The shop database did not respond. Check that the database is running, then try again.</p>
      <button type="button" className="btn" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
