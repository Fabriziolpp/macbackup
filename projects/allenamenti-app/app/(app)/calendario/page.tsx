'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SettimanaView from '@/components/calendario/SettimanaView';
import MeseView from '@/components/calendario/MeseView';
import AnnoView from '@/components/calendario/AnnoView';

type Vista = 'settimana' | 'mese' | 'anno';
const VISTE: { id: Vista; label: string }[] = [
  { id: 'settimana', label: 'Settimana' },
  { id: 'mese',      label: 'Mese' },
  { id: 'anno',      label: 'Anno' },
];

function CalendarioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('v');
  const vista: Vista = raw === 'mese' || raw === 'anno' ? raw : 'settimana';

  // Se manca ?v=, normalizza l'URL a ?v=settimana (back button / bookmark friendly)
  useEffect(() => {
    if (raw !== 'settimana' && raw !== 'mese' && raw !== 'anno') {
      router.replace('/calendario?v=settimana');
    }
  }, [raw, router]);

  function setVista(v: Vista) {
    router.replace(`/calendario?v=${v}`);
  }

  return (
    <div style={{ padding: '12px 16px 0', minHeight: '100dvh' }}>
      <h1
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 40, fontWeight: 800, lineHeight: 0.9, letterSpacing: 0.3,
          textTransform: 'uppercase', color: 'var(--gt-text-primary)',
          margin: '8px 0 16px',
        }}
      >
        Agenda
      </h1>

      {/* Segmented control Settimana / Mese / Anno */}
      <div
        style={{
          display: 'flex', gap: 0,
          background: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 4, marginBottom: 16,
        }}
      >
        {VISTE.map(v => {
          const active = v.id === vista;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              aria-pressed={active}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 11, border: 'none', cursor: 'pointer',
                background: active ? 'var(--gt-hero-bg)' : 'transparent',
                color: active ? '#fff' : 'var(--gt-text-secondary)',
                fontFamily: 'var(--font-barlow-condensed)', fontSize: 14, fontWeight: 800,
                letterSpacing: 1, textTransform: 'uppercase',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {vista === 'settimana' && <SettimanaView />}
      {vista === 'mese' && <MeseView />}
      {vista === 'anno' && <AnnoView />}
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={null}>
      <CalendarioInner />
    </Suspense>
  );
}
