'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// G1/R1: tab bar a 5 slot come da design handoff. Pill scura floating (non
// ancorata ai bordi). Live è una voce vera (bottone lime), non più un FAB.
const TABS = [
  { key: 'home', href: '/home', label: 'Home' },
  { key: 'agenda', href: '/calendario', label: 'Agenda' },   // route resta /calendario (rename solo label)
  { key: 'live', href: '/live', label: 'Live' },             // slot speciale lime
  { key: 'schede', href: '/schede', label: 'Schede' },
  { key: 'profilo', href: '/profilo', label: 'Profilo' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function GtTabBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        left: 14, right: 14,
        bottom: 'calc(18px + env(safe-area-inset-bottom))',
        zIndex: 50,
        background: '#0C0C0C',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 26,
        boxShadow: '0 18px 38px -14px rgba(0,0,0,0.6)',
        padding: '9px 8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
      }}
    >
      {TABS.map(t => {
        const isActive = pathname === t.href || (pathname?.startsWith(t.href + '/') ?? false);
        if (t.key === 'live') return <LiveSlot key={t.key} href={t.href} />;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '6px 4px',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.42)',
              textDecoration: 'none',
              minHeight: 44,
            }}
          >
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <TabIcon name={t.key} />
              {/* puntino lime sotto l'icona quando attiva */}
              <span
                aria-hidden
                style={{
                  width: 4, height: 4, borderRadius: '50%', marginTop: 3,
                  background: isActive ? 'var(--gt-accent)' : 'transparent',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-barlow)',
                fontSize: 9.5, fontWeight: 600, letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function LiveSlot({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Allenamento Live"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: 52, height: 44, borderRadius: 15,
          background: 'var(--gt-accent)',
          color: '#0C0C0C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 16px -5px rgba(200,241,53,0.55)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: 'var(--gt-accent)',
        }}
      >
        Live
      </span>
    </Link>
  );
}

function TabIcon({ name }: { name: Exclude<TabKey, 'live'> }) {
  const common = {
    width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2z" /></svg>;
    case 'agenda':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>;
    case 'schede':
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'profilo':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
  }
}
