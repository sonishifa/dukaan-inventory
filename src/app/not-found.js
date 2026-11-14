import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="panel">
      <h1>Page not found</h1>
      <p className="muted">This bill or page does not exist.</p>
      <Link href="/" className="btn">Go to today</Link>
    </div>
  );
}
