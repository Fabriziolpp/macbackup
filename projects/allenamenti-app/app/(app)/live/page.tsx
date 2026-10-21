'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp, tipoEsercizi, type Esercizio } from '@/providers/AppProvider';
import { useLiveStore } from '@/lib/liveStore';
import { MESI_S, parseLocalDate, addDays } from '@/lib/dateUtils';
import ConfirmModal from '@/components/modals/ConfirmModal';

// F8: oltre questa età una sessione non terminata è considerata "stale" e
// all'apertura della setup viene proposto di riprenderla o scartarla.
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

// FIX6 F2: mappa un Esercizio della scheda all'input atteso da startSession.
function mapEx(e: Esercizio) {
  return {
    id: e.id,
    titolo: e.titolo,
    ripetizioni: e.ripetizioni,
    carico: e.carico,
    recupero: e.recupero,
    note: e.note,
    setsTarget: e.setsTarget,
    exerciseId: e.exerciseId,
    restSeconds: e.restSeconds,
  };
}

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const GIORNI_SHORT = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

function formatDateShort(d: Date): string {
  const dow = GIORNI_SHORT[(d.getDay() + 6) % 7];
  return `${dow} ${d.getDate()} ${MESI_S[d.getMonth()].toUpperCase()}`;
}

function formatTimeHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LiveSetupPage() {
  const router = useRouter();
  const { schede, activeScheda, setActiveSchedaId } = useApp();

  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [now, setNow] = useState<Date>(() => new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeSession = useLiveStore(s => s.session);
  const hydrated = useLiveStore(s => s.hydrated);
  const hydrate = useLiveStore(s => s.hydrate);
  const startSession = useLiveStore(s => s.startSession);
  const clearSession = useLiveStore(s => s.clearSession);

  // F8 edge cases: collisione nuova sessione + sessione stale.
  const [showCollision, setShowCollision] = useState(false);
  const [showStale, setShowStale] = useState(false);
  const staleHandled = useRef(false);

  // Tick clock al minuto
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Hydrate store da IndexedDB al primo mount
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // F8: rilevamento sessione stale. Dopo l'hydrate, se la sessione è iniziata
  // da oltre STALE_SESSION_MS, propone "Riprendi o scarta" (una sola volta).
  useEffect(() => {
    if (!hydrated || !activeSession || staleHandled.current) return;
    const ageMs = Date.now() - new Date(activeSession.startedAt).getTime();
    if (ageMs > STALE_SESSION_MS) {
      staleHandled.current = true;
      setShowStale(true);
    }
  }, [hydrated, activeSession]);

  // Reset selectedTipoId quando cambia scheda (default = primo tipo)
  useEffect(() => {
    if (!activeScheda) {
      setSelectedTipoId(null);
      return;
    }
    const stillValid = selectedTipoId && activeScheda.tipi.some(t => t.id === selectedTipoId);
    if (!stillValid) setSelectedTipoId(activeScheda.tipi[0]?.id ?? null);
  }, [activeScheda?.id]);

  // Settimana corrente del programma (auto-preselect)
  const computedCurrentWeek = useMemo(() => {
    if (!activeScheda?.dataInizio || !activeScheda.weeks) return 1;
    const start = parseLocalDate(activeScheda.dataInizio);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
    if (diffDays < 0) return 1;
    return Math.min(Math.floor(diffDays / 7) + 1, activeScheda.weeks);
  }, [activeScheda?.dataInizio, activeScheda?.weeks, now]);

  useEffect(() => {
    setSelectedWeek(computedCurrentWeek);
  }, [computedCurrentWeek]);

  const dateRange = useMemo(() => {
    if (!activeScheda?.dataInizio || !activeScheda.weeks) {
      return activeScheda?.mese ? activeScheda.mese.toUpperCase() : '';
    }
    const start = parseLocalDate(activeScheda.dataInizio);
    const end = addDays(start, activeScheda.weeks * 7 - 1);
    return `${formatDateShort(start)} — ${formatDateShort(end)}`;
  }, [activeScheda?.dataInizio, activeScheda?.weeks, activeScheda?.mese]);

  const dayLabel = GIORNI[(now.getDay() + 6) % 7];
  const time = formatTimeHM(now);
  const weeks = activeScheda?.weeks ?? 4;
  const canStart = !!activeScheda && !!selectedTipoId;

  function handleStart() {
    if (!canStart) return;
    // F8: se esiste una sessione in corso, "Inizia" la sovrascriverebbe
    // silenziosamente → chiedi conferma prima.
    if (activeSession) {
      setShowCollision(true);
      return;
    }
    doStart();
  }

  function doStart() {
    if (!activeScheda || !selectedTipoId) return;
    const tipo = activeScheda.tipi.find(t => t.id === selectedTipoId);
    if (!tipo) return;
    startSession({
      schedaId: activeScheda.id,
      schedaNome: activeScheda.nome,
      tipoId: tipo.id,
      tipoNome: tipo.nome,
      week: selectedWeek,
      // FIX6 F2: passa la struttura del giorno — singoli + blocchi. La sessione
      // costruisce i segmenti (esercizio o blocco AMRAP) da questa.
      esercizi: tipo.esercizi.map(mapEx),
      blocchi: tipo.blocchi
        .filter((b): b is typeof b & { tipo: 'circuito_amrap' | 'circuito_giri' } => b.tipo !== 'singolo')
        .map(b => ({
          id: b.id,
          tipo: b.tipo,
          durataMinuti: b.durataMinuti,
          notaComune: b.notaComune,
          esercizi: b.esercizi.map(mapEx),
        })),
    });
    router.push('/live/countdown');
  }

  return (
    <div style={{ padding: '12px 20px 40px', minHeight: '100dvh' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 34, fontWeight: 900, letterSpacing: -1, lineHeight: 1,
            color: 'var(--gt-text-primary)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Allenati
        </h1>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
            color: 'var(--gt-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {dayLabel} · {time}
        </div>
      </div>

      {/* Banner sessione in corso */}
      {activeSession && (
        <Link
          href="/live/workout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'rgba(200,241,53,0.10)',
            border: '1px solid rgba(200,241,53,0.40)',
            borderRadius: 8,
            marginBottom: 20,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gt-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0D0D0D" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                color: 'var(--gt-accent)',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              In corso
            </div>
            <div
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
                color: 'var(--gt-text-primary)',
                textTransform: 'uppercase',
                marginBottom: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {activeSession.schedaNome} · {activeSession.tipoNome}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 11, fontWeight: 600, letterSpacing: 1,
                color: 'var(--gt-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Parte {activeSession.currentSegmentIdx + 1}/{activeSession.segments.length}
              {' · '}
              {Math.round(activeSession.totalElapsedSec / 60)} min
            </div>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--gt-text-muted)', flexShrink: 0 }}
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* Scheda attiva */}
      <SectionLabel>Scheda attiva</SectionLabel>
      {schede.length === 0 ? (
        <p
          style={{
            color: 'var(--gt-text-muted)',
            fontFamily: 'var(--font-barlow)',
            fontSize: 13, fontStyle: 'italic',
            marginBottom: 20,
          }}
        >
          Nessuna scheda disponibile —{' '}
          <Link href="/schede" style={{ color: 'var(--gt-accent)' }}>creane una in Schede</Link>.
        </p>
      ) : (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setDropdownOpen(o => !o)}
            aria-expanded={dropdownOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '14px 16px',
              background: 'var(--gt-surface)',
              border: '1px solid var(--gt-border-strong)',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 17, fontWeight: 800, letterSpacing: 0.5,
                  color: 'var(--gt-text-primary)',
                  textTransform: 'uppercase',
                  marginBottom: dateRange ? 2 : 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {activeScheda?.nome ?? '—'}
              </div>
              {dateRange && (
                <div
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                    color: 'var(--gt-text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  {dateRange}
                </div>
              )}
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{
                color: 'var(--gt-text-muted)', flexShrink: 0, marginLeft: 12,
                transition: 'transform 0.2s',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0, right: 0,
                background: 'var(--gt-bg)',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04))',
                border: '1px solid var(--gt-border-strong)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                zIndex: 10,
                overflow: 'hidden',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {schede.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveSchedaId(s.id);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    background: s.id === activeScheda?.id ? 'rgba(200,241,53,0.10)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--gt-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-barlow-condensed)',
                    fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
                    color: s.id === activeScheda?.id ? 'var(--gt-accent)' : 'var(--gt-text-primary)',
                    textTransform: 'uppercase',
                  }}
                >
                  {s.nome}
                </button>
              ))}
              <Link
                href="/schede"
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                  color: 'var(--gt-text-muted)',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
                onClick={() => setDropdownOpen(false)}
              >
                + Cambia in Schede
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tipo allenamento */}
      {activeScheda && activeScheda.tipi.length > 0 && (
        <>
          <SectionLabel>Tipo allenamento</SectionLabel>
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              marginBottom: 20,
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}
          >
            {activeScheda.tipi.map(t => {
              const isSelected = selectedTipoId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTipoId(t.id)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 14px',
                    background: isSelected ? 'var(--gt-accent)' : 'var(--gt-surface)',
                    border: `1px solid ${isSelected ? 'var(--gt-accent)' : 'var(--gt-border-strong)'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-barlow-condensed)',
                    fontSize: 12, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: isSelected ? '#0D0D0D' : 'var(--gt-text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                  aria-pressed={isSelected}
                >
                  {t.nome} · {tipoEsercizi(t).length}EX
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Settimana del programma */}
      {activeScheda && weeks > 0 && (
        <>
          <SectionLabel>Settimana del programma</SectionLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${weeks}, 1fr)`,
              gap: 6,
              marginBottom: 28,
            }}
          >
            {Array.from({ length: weeks }, (_, i) => i + 1).map(w => {
              const isSelected = selectedWeek === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  style={{
                    padding: '10px 4px',
                    background: isSelected ? 'var(--gt-accent)' : 'var(--gt-surface)',
                    border: `1px solid ${isSelected ? 'var(--gt-accent)' : 'var(--gt-border-strong)'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-barlow-condensed)',
                    fontSize: 11, fontWeight: 700, letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: isSelected ? '#0D0D0D' : 'var(--gt-text-primary)',
                  }}
                  aria-pressed={isSelected}
                >
                  {w}ª SETT.
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '16px 24px',
          background: canStart ? 'var(--gt-accent)' : 'var(--gt-surface)',
          color: canStart ? '#0D0D0D' : 'var(--gt-text-muted)',
          border: canStart ? 'none' : '1px solid var(--gt-border-strong)',
          borderRadius: 8,
          cursor: canStart ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 14, fontWeight: 900, letterSpacing: 2.5,
          textTransform: 'uppercase',
          opacity: canStart ? 1 : 0.5,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
        Inizia allenamento
      </button>

      {/* EMOM Rocker entrypoint */}
      <div style={{ height: 1, background: 'var(--gt-border-strong)', margin: '24px 0 16px', opacity: 0.6 }} />
      <Link
        href="/live/emom"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 20px',
          background: 'transparent',
          color: 'var(--gt-text-primary)',
          border: '1px solid var(--gt-border-strong)',
          borderRadius: 8,
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 13, fontWeight: 800, letterSpacing: 2,
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        EMOM Rocker
      </Link>

      {/* F8: conferma prima di sovrascrivere una sessione in corso */}
      {showCollision && (
        <ConfirmModal
          kicker="Sessione in corso"
          msg="Hai un allenamento già in corso. Iniziarne uno nuovo lo scarterà definitivamente. Procedere?"
          cancelLabel="Annulla"
          confirmLabel="Scarta e inizia"
          onConfirm={doStart}
          onClose={() => setShowCollision(false)}
        />
      )}

      {/* F8: sessione stale (>24h) → riprendi o scarta */}
      {showStale && (
        <ConfirmModal
          kicker="Sessione vecchia"
          msg="Hai una sessione iniziata più di 24 ore fa. Vuoi riprenderla o scartarla?"
          cancelLabel="Riprendi"
          confirmLabel="Scarta"
          onConfirm={() => { clearSession(); setShowStale(false); }}
          onClose={() => setShowStale(false)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-barlow-condensed)',
        fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
        color: 'var(--gt-text-muted)',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
