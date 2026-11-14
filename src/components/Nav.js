'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/bills/new', label: 'New bill', primary: true },
  { href: '/', label: 'Today' },
  { href: '/products', label: 'Products' },
  { href: '/bills', label: 'Bills' },
  { href: '/reports', label: 'Reports' },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href) =>
    href === '/' ? pathname === '/' : href === '/bills' ? pathname === '/bills' || /^\/bills\/\d+/.test(pathname) : pathname.startsWith(href);
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={l.primary ? 'nav-primary' : undefined}
          aria-current={isActive(l.href) ? 'page' : undefined}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
