'use client';

import { useEffect, useState } from 'react';
import { useLiveStore } from '@/lib/liveStore';
import type { SessionBlock } from '@/lib/liveTypes';

const ACCENT = '#C8F135';

function fmtMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// FIX6 F2: pagina unica del blocco AMRAP. Countdown di durata_minuti, nota
// comune una volta, lista esercizi del blocco e contatore giri con log
// reps/carico inline per giro (opzionale). Nessun timer di recupero (SPEC §4).
export default function AmrapBlock({ block }: { block: SessionBlock }) {
  const startBlockTimer = useLiveStore(s => s.startBlockTimer);
  const completeRound = useLiveStore(s => s.completeRound);
  const updateRoundEntry = useLiveStore(s => s.updateRoundEntry);
  const removeRound = useLiveStore(s => s.removeRound);
  const [, setTick] = useState(0);

  // Avvia il countdown quando il blocco diventa attivo (una volta).
  useEffect(() => {
    if (block.blockStartedAt == null) startBlockTimer();
  }, [block.blockStartedAt, startBlockTimer]);

  // Re-render al secondo per il countdown.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSec = block.durataMinuti * 60;
  const elapsed = block.blockStartedAt != null
    ? Math.max(0, Math.floor((Date.now() - block.blockStartedAt) / 1000))
    : 0;
  const remaining = Math.max(0, totalSec - elapsed);
  const expired = block.blockStartedAt != null && remaining <= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Countdown */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${expired ? 'var(--gt-neg)' : 'var(--gt-border-strong)'}`,
          borderRadius: 12,
          padding: '16px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 800,
          letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          AMRAP {block.durataMinuti}&apos;
        </div>
        <div style={{
          fontFamily: 'var(--font-barlow-condensed)', fontSize: 48, fontWeight: 900,
          lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums',
          color: expired ? 'var(--gt-neg)' : ACCENT,
        }}>
          {expired ? 'TEMPO SCADUTO' : fmtMMSS(remaining)}
        </div>
      </div>

      {/* Nota comune (una volta) */}
      {block.notaComune && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)',
            borderLeft: `3px solid ${ACCENT}`,
            borderRadius: 4,
            fontFamily: 'var(--font-barlow)', fontSize: 15, fontStyle: 'italic',
            color: 'rgba(255,255,255,0.75)', lineHeight: 1.4,
          }}
        >
          {block.notaComune}
        </div>
      )}

      {/* Esercizi del blocco (riferimento) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {block.exercises.map((e, i) => (
          <div
            key={e.exerciseId}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--gt-border-strong)',
              borderRadius: 8,
            }}
          >
            <span style={{
              fontFamily: 'var(--font-barlow-condensed)', fontWeight: 900, fontSize: 16,
              color: 'rgba(255,255,255,0.4)', minWidth: 24, fontVariantNumeric: 'tabular-nums',
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{
              flex: 1, minWidth: 0, fontFamily: 'var(--font-barlow)', fontWeight: 700,
              fontSize: 15, color: '#F0F0F0',
            }}>
              {e.name}
            </span>
            <span style={{
              fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(255,255,255,0.55)',
            }}>
              {[e.reps, e.load].filter(v => v && v !== '—').join(' · ')}
            </span>
          </div>
        ))}
      </div>

      {/* Giro completato */}
      <button
        type="button"
        onClick={completeRound}
        style={{
          width: '100%', padding: '14px 20px',
          background: ACCENT, color: '#0D0D0D', border: 'none', borderRadius: 10,
          cursor: 'pointer',
          fontFamily: 'var(--font-barlow-condensed)', fontSize: 14, fontWeight: 900,
          letterSpacing: 1.5, textTransform: 'uppercase',
        }}
      >
        + Giro completato{block.rounds.length > 0 ? ` · ${block.rounds.length} fatti` : ''}
      </button>

      {/* Log per giro (inline, opzionale). Il più recente in alto. */}
      {block.rounds.map((round, ri) => (
        <div
          key={ri}
          style={{
            border: '1px solid var(--gt-border-strong)',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 13, fontWeight: 800,
              letterSpacing: 1.5, color: ACCENT, textTransform: 'uppercase',
            }}>
              Giro {ri + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRound(ri)}
              aria-label={`Elimina giro ${ri + 1}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--gt-neg)', padding: 4, display: 'flex',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {block.exercises.map((e, ei) => (
              <div key={e.exerciseId} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 72px', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(255,255,255,0.75)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {e.name}
                </span>
                <LogInput
                  value={round.entries[ei]?.reps ?? ''}
                  placeholder="reps"
                  ariaLabel={`Reps ${e.name} giro ${ri + 1}`}
                  onChange={v => updateRoundEntry(ri, ei, 'reps', v)}
                />
                <LogInput
                  value={round.entries[ei]?.load ?? ''}
                  placeholder="carico"
                  ariaLabel={`Carico ${e.name} giro ${ri + 1}`}
                  onChange={v => updateRoundEntry(ri, ei, 'load', v)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LogInput({
  value, placeholder, ariaLabel, onChange,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--gt-border-strong)',
        borderRadius: 6, color: '#F0F0F0',
        fontFamily: 'var(--font-barlow)', fontSize: 13, textAlign: 'center',
        outline: 'none',
      }}
    />
  );
}
