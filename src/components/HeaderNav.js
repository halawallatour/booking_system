'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Voucher Management', icon: '📋' },
  { href: '/dashboard', label: 'Executive Dashboard', icon: '📊' },
];

export default function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 h-14">
      {LINKS.map(l => {
        // home matches only exactly; others match by prefix (e.g. /customers/* keeps Voucher tab active)
        const active = l.href === '/'
          ? (pathname === '/' || pathname.startsWith('/customers') || pathname.startsWith('/sql-editor') || pathname.startsWith('/database'))
          : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-4 h-full text-sm font-medium transition-colors border-b-2 ${
              active
                ? 'text-[var(--color-brand)] font-semibold border-[var(--color-brand)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] border-transparent'
            }`}
          >
            <span>{l.icon}</span><span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
