'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: '마인드맵' },
  { href: '/retro', label: '회고록' },
];

/** 상단 헤더의 탭 링크. 현재 탭만 밝게 둔다. */
export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 items-center gap-3 text-xs">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? 'page' : undefined}
          className={
            pathname === tab.href
              ? 'text-fg-strong'
              : 'text-faint transition hover:text-fg'
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
