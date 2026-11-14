import Link from 'next/link';
import Nav from '@/components/Nav';
import './globals.css';

export const metadata = {
  title: { default: 'Dukaan: billing and stock', template: '%s | Dukaan' },
  description: 'Billing and inventory for a small shop',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand">
              Dukaan
              <small>Billing and stock</small>
            </Link>
            <Nav />
            <div className="version">Version {process.env.APP_VERSION}</div>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
