'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp, Esercizio, Blocco, tipoEsercizi } from '@/providers/AppProvider';
import { schedaColor } from '@/lib/utils';

export default function SchedeCurrentPage() {
  const router = useRouter();
  const { schede, activeScheda } = useApp();
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);

  // 0 schede → manda all'archivio (PDF import + + Nuova)
  useEffect(() => {
    if (schede.length === 0) router.replace('/schede/archivio');
  }, [schede.length, router]);

  // Reset selectedTipoId quando cambia scheda; default = primo tipo
  useEffect(() => {
    if (!activeScheda) {
      setSelectedTipoId(null);
      return;
    }
    const stillValid = selectedTipoId && activeScheda.tipi.some(t => t.id === selectedTipoId);
    if (!stillValid) setSelectedTipoId(activeScheda.tipi[0]?.id ?? null);
  }, [activeScheda?.id]);

  if (schede.length === 0 || !activeScheda) {
    return null;
  }

  const col = schedaColor(activeScheda.nome);
  const selectedTipo = activeScheda.tipi.find(t => t.id === selectedTipoId) ?? activeScheda.tipi[0] ?? null;

  return (
    <div className="gt-shell">
      <div className="gt-canvas">

        {/* Header */}
        <section style={{ padding: '28px 28px 0', animation: 'gtFadeUp 0.5s ease 0.1s both' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                  color: 'var(--gt-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Scheda attuale
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 30, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.05,
                  color: 'var(--gt-text-primary)',
                  textTransform: 'uppercase',
                  margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {activeScheda.nome}
              </h1>
              {activeScheda.mese && (
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: 'var(--font-barlow)', fontSize: 13,
                    color: 'var(--gt-text-secondary)',
                  }}
                >
                  {activeScheda.mese}
                </div>
              )}
            </div>
            <Link
              href="/schede/archivio"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                background: 'transparent',
                color: 'var(--gt-text-primary)',
                border: '1px solid var(--gt-border-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Cambia scheda
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Coloured accent bar */}
          <div style={{ height: 3, background: col.text, borderRadius: 2, marginBottom: 20 }} />
        </section>

        {/* Day selector */}
        {activeScheda.tipi.length > 0 && (
          <section style={{ padding: '0 28px', animation: 'gtFadeUp 0.5s ease 0.18s both' }}>
            <div
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                color: 'var(--gt-text-muted)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Giorno / Attività
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {activeScheda.tipi.map(t => {
                const isSelected = selectedTipo?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTipoId(t.id)}
                    aria-pressed={isSelected}
                    style={{
                      flexShrink: 0,
                      padding: '11px 16px',
                      background: isSelected ? 'var(--gt-accent)' : 'var(--gt-surface)',
                      border: `1px solid ${isSelected ? 'var(--gt-accent)' : 'var(--gt-border-strong)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-barlow-condensed)',
                      fontSize: 13, fontWeight: 800, letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      color: isSelected ? '#0D0D0D' : 'var(--gt-text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.nome} · {tipoEsercizi(t).length}EX
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Selected day exercises */}
        <section style={{ padding: '24px 28px 40px', animation: 'gtFadeUp 0.5s ease 0.25s both' }}>
          {!selectedTipo ? (
            <p className="gt-empty">Questa scheda non ha ancora giorni di allenamento.</p>
          ) : tipoEsercizi(selectedTipo).length === 0 ? (
            <p className="gt-empty">Nessun esercizio in {selectedTipo.nome}.</p>
          ) : (
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 22, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.1,
                  color: 'var(--gt-text-primary)',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                {selectedTipo.nome}
              </div>
              {/* Esercizi singoli */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {selectedTipo.esercizi.map((e, i) => (
                  <ExerciseRow key={e.id} es={e} index={i} />
                ))}
              </ul>
              {/* FIX6 §5: una card per blocco circuito */}
              {selectedTipo.blocchi.map(b => (
                <BloccoCard key={b.id} blocco={b} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// FIX6 §5: card del blocco circuito nella "scheda attuale". Header (AMRAP <min>'
// o Circuito · N giri) + nota comune una sola volta, poi gli esercizi del blocco.
function BloccoCard({ blocco }: { blocco: Blocco }) {
  const isAmrap = blocco.tipo === 'circuito_amrap';
  const header = isAmrap
    ? `AMRAP ${blocco.durataMinuti ?? '?'}'`
    : blocco.tipo === 'circuito_giri'
      ? `Circuito${blocco.giriTarget ? ` · ${blocco.giriTarget} giri` : ''}`
      : 'Circuito';
  return (
    <div
      style={{
        marginBottom: 10,
        padding: '14px 16px',
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.08)',
        borderLeft: '4px solid var(--gt-accent)',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-barlow-condensed)', fontSize: 16, fontWeight: 900,
          letterSpacing: 0.5, color: '#111111', textTransform: 'uppercase',
        }}>
          {header}
        </span>
        {blocco.notaComune && (
          <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, fontStyle: 'italic', color: '#555' }}>
            {blocco.notaComune}
          </span>
        )}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {blocco.esercizi.map((e, i) => (
          <ExerciseRow key={e.id} es={e} index={i} />
        ))}
      </ul>
    </div>
  );
}

function ExerciseRow({ es, index }: { es: Esercizio; index: number }) {
  const tags: { label: string; value: string }[] = [];
  if (es.ripetizioni) tags.push({ label: 'Reps', value: es.ripetizioni });
  if (es.carico) tags.push({ label: 'Carico', value: es.carico });
  if (es.recupero) tags.push({ label: 'Recupero', value: es.recupero });

  return (
    <li
      style={{
        padding: '16px 18px',
        marginBottom: 10,
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-barlow)',
          fontSize: 18, fontWeight: 700, lineHeight: 1.25,
          color: '#111111',
          marginBottom: tags.length > 0 || es.note ? 10 : 0,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            minWidth: 22,
            marginRight: 8,
            fontFamily: 'var(--font-barlow-condensed)',
            fontWeight: 900,
            color: '#AAAAAA',
            fontSize: 14,
          }}
          aria-hidden
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {es.titolo}
      </div>

      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: es.note ? 10 : 0,
          }}
        >
          {tags.map(t => (
            <div
              key={t.label}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                padding: '6px 12px',
                background: '#F4F2EE',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 6,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                  color: '#888888',
                  textTransform: 'uppercase',
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontSize: 15, fontWeight: 700,
                  color: '#111111',
                }}
              >
                {t.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {es.note && (
        <p
          style={{
            fontFamily: 'var(--font-barlow)',
            fontSize: 14, fontStyle: 'italic', lineHeight: 1.4,
            color: '#666666',
            margin: 0,
            paddingLeft: 12,
            borderLeft: '2px solid rgba(0,0,0,0.1)',
          }}
        >
          {es.note}
        </p>
      )}
    </li>
  );
}
