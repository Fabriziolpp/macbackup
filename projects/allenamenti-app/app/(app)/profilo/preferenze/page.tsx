'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPrefs, setPrefs, type Unit } from '@/lib/prefs';

// R1/Preferenze (base): default recupero (wired nel Live), unità e lingua
// (persistite, display-only per ora). Tema rinviato (nessun sistema tema).
export default function PreferenzePage() {
  const [rest, setRest] = useState('90');
  const [unit, setUnit] = useState<Unit>('kg');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = getPrefs();
    setRest(String(p.defaultRestSeconds));
    setUnit(p.unit);
    setLoaded(true);
  }, []);

  function commitRest(v: string) {
    setRest(v);
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n > 0) setPrefs({ defaultRestSeconds: n });
  }

  function commitUnit(u: Unit) {
    setUnit(u);
    setPrefs({ unit: u });
  }

  if (!loaded) return null;

  return (
    <div style={{ padding: '12px 16px 0', minHeight: '100dvh' }}>
      {/* Back + titolo */}
      <Link
        href="/profilo"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, margin: '8px 0 4px',
          fontFamily: 'var(--font-barlow-condensed)', fontSize: 12, fontWeight: 700,
          letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gt-text-secondary)',
          textDecoration: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Profilo
      </Link>
      <h1
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 40, fontWeight: 800, lineHeight: 0.9, letterSpacing: 0.3,
          textTransform: 'uppercase', color: 'var(--gt-text-primary)',
          margin: '4px 0 20px',
        }}
      >
        Preferenze
      </h1>

      {/* Default recupero */}
      <Field label="Recupero predefinito" hint="Usato quando la scheda non specifica il recupero.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={rest}
            onChange={e => commitRest(e.target.value)}
            aria-label="Secondi di recupero predefinito"
            style={inputStyle}
          />
          <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, color: 'var(--gt-text-secondary)' }}>
            secondi
          </span>
        </div>
      </Field>

      {/* Unità */}
      <Field label="Unità di carico" hint="Al momento indicativa (nessuna conversione).">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['kg', 'lbs'] as Unit[]).map(u => (
            <button
              key={u}
              type="button"
              onClick={() => commitUnit(u)}
              aria-pressed={unit === u}
              style={{
                flex: 1, height: 44, borderRadius: 12, cursor: 'pointer',
                background: unit === u ? 'var(--gt-accent)' : 'var(--gt-card)',
                border: `1px solid ${unit === u ? 'var(--gt-accent)' : 'var(--gt-border)'}`,
                color: unit === u ? '#0C0C0C' : 'var(--gt-text-primary)',
                fontFamily: 'var(--font-barlow-condensed)', fontSize: 14, fontWeight: 800,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </Field>

      {/* Lingua (display-only) */}
      <Field label="Lingua" hint="Italiano (altre lingue in arrivo).">
        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: 'var(--gt-text-secondary)' }}>
          Italiano
        </div>
      </Field>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: 120, height: 44, padding: '0 12px',
  background: 'var(--gt-card)', border: '1px solid var(--gt-border)', borderRadius: 12,
  color: 'var(--gt-text-primary)', fontFamily: 'var(--font-barlow)', fontSize: 15,
  outline: 'none',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 700,
          color: 'var(--gt-text-primary)', marginBottom: hint ? 2 : 8,
        }}
      >
        {label}
      </div>
      {hint && (
        <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 12.5, color: 'var(--gt-text-muted)', marginBottom: 8 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}
