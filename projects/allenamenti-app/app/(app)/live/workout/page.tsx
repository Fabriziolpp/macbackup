'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveStore } from '@/lib/liveStore';
import { parseExerciseSpec } from '@/lib/parseExerciseSpec';
import type { SessionSegment } from '@/lib/liveTypes';
import TimerRing from '@/components/live/TimerRing';
import AmrapBlock from '@/components/live/AmrapBlock';

function segmentLabel(seg: SessionSegment): string {
  return seg.kind === 'amrap' ? `AMRAP ${seg.block.durataMinuti}'` : seg.exercise.name;
}

const ACCENT = '#C8F135';

export default function LiveWorkoutPage() {
  const router = useRouter();
  const session = useLiveStore(s => s.session);
  const hydrated = useLiveStore(s => s.hydrated);
  const hydrate = useLiveStore(s => s.hydrate);
  const toggleSet = useLiveStore(s => s.toggleSet);
  const pauseSession = useLiveStore(s => s.pauseSession);
  const goPrevSegment = useLiveStore(s => s.goPrevSegment);
  const goNextSegment = useLiveStore(s => s.goNextSegment);
  const tickElapsed = useLiveStore(s => s.tickElapsed);
  const clearRestTimer = useLiveStore(s => s.clearRestTimer);

  // F8 a11y: messaggio annunciato via aria-live al completamento/annullamento serie.
  const [announce, setAnnounce] = useState('');

  // Hydrate
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // Nessuna sessione dopo hydrate → torna a setup
  useEffect(() => {
    if (hydrated && !session) router.replace('/live');
  }, [hydrated, session, router]);

  // Tick elapsed ogni secondo quando active. Visibility change: aggiunge il
  // delta accumulato in background al ritorno foreground.
  const lastTickRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTickRef.current) / 1000);
      if (delta > 0) {
        tickElapsed(delta);
        lastTickRef.current = lastTickRef.current + delta * 1000;
      }
    }, 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const delta = Math.floor((now - lastTickRef.current) / 1000);
        if (delta > 0) {
          tickElapsed(delta);
          lastTickRef.current = lastTickRef.current + delta * 1000;
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [session?.status, tickElapsed]);

  // Aggregati progress bar e counter — DEVONO essere prima dell'early return
  // perché useMemo va chiamato sempre nello stesso ordine.
  const { totalSetsDone, totalSets } = useMemo(() => {
    if (!session) return { totalSetsDone: 0, totalSets: 0 };
    let done = 0, total = 0;
    for (const seg of session.segments) {
      if (seg.kind !== 'exercise') continue;
      done += seg.exercise.setsDone.length;
      total += seg.exercise.setsTarget;
    }
    return { totalSetsDone: done, totalSets: total };
  }, [session]);

  if (!session) return null;

  const curIdx = session.currentSegmentIdx;
  const seg = session.segments[curIdx];
  if (!seg) return null;

  const cur = seg.kind === 'exercise' ? seg.exercise : null;
  const parsed = cur ? parseExerciseSpec(cur.reps, cur.load, session.week) : null;

  const isLastSegment = curIdx === session.segments.length - 1;
  const nextSeg = !isLastSegment ? session.segments[curIdx + 1] : null;
  // Progress: set-based se ci sono esercizi a serie; altrimenti (giorno tutto
  // AMRAP) avanzamento per segmento.
  const progressPct = totalSets > 0
    ? Math.round((totalSetsDone / totalSets) * 100)
    : Math.round((curIdx / Math.max(1, session.segments.length)) * 100);

  function handleToggleSet(i: number, currentlyDone: boolean) {
    toggleSet(i);
    setAnnounce(currentlyDone ? `Serie ${i + 1} annullata` : `Serie ${i + 1} completata`);
  }

  function handlePause() {
    pauseSession();
    router.push('/live/pausa');
  }

  function handleTermina() {
    router.push('/live/summary');
  }

  function handleNextOrFinish() {
    if (isLastSegment) {
      router.push('/live/summary');
    } else {
      goNextSegment();
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        color: '#F0F0F0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* F8 a11y: live region per screen reader (serie completata/annullata) */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute', width: 1, height: 1,
          overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)',
          whiteSpace: 'nowrap', border: 0, padding: 0, margin: -1,
        }}
      >
        {announce}
      </div>

      {/* Header sticky */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#0A0A0A',
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px 12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 6, height: 6, borderRadius: '50%',
                background: '#FF5555',
                animation: 'recPulse 1.4s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {session.schedaNome} · {session.tipoNome}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePause}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: '#F0F0F0',
              border: '1px solid var(--gt-border-strong)',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-barlow-condensed)',
              fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
            aria-label="Metti in pausa l'allenamento"
          >
            Pausa
          </button>
          <button
            type="button"
            onClick={handleTermina}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: '#F0F0F0',
              border: '1px solid var(--gt-border-strong)',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-barlow-condensed)',
              fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
            aria-label="Termina e vai a riepilogo"
          >
            Termina
          </button>
        </div>
        {/* Progress bar 3px */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: ACCENT,
              transition: 'width 240ms ease',
            }}
          />
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Counter row */}
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 12, fontWeight: 700, letterSpacing: 1.6,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
          }}
        >
          Parte{' '}
          <span style={{ color: '#F0F0F0' }}>{curIdx + 1}/{session.segments.length}</span>
          {cur && (
            <>
              {' · '}
              <span style={{ color: '#F0F0F0' }}>{cur.setsDone.length}/{cur.setsTarget}</span>{' '}
              serie
            </>
          )}
        </div>

        {cur && parsed ? (
          <>
            {/* Nome esercizio */}
            <h1
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontSize: 32, fontWeight: 900, letterSpacing: -0.7,
                lineHeight: 1,
                color: '#F0F0F0',
                margin: 0,
                wordBreak: 'break-word',
              }}
            >
              {cur.name}
            </h1>

            {/* 2 target card — REPS + CARICO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <TargetCard label="Reps" value={parsed.repsLabel} highlight />
              <TargetCard label="Carico" value={parsed.loadLabel} />
            </div>

            {/* Note esercizio conditional */}
            {cur.note && (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: `3px solid ${ACCENT}`,
                  borderRadius: 4,
                  fontFamily: 'var(--font-barlow)',
                  fontSize: 16, fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.4,
                }}
              >
                {cur.note}
              </div>
            )}

            {/* Lista serie */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: cur.setsTarget }, (_, i) => {
                const done = cur.setsDone.some(s => s.index === i);
                return (
                  <SetRow
                    key={i}
                    index={i}
                    reps={parsed.repsPerSet}
                    load={parsed.loadPerSet}
                    done={done}
                    onTap={() => handleToggleSet(i, done)}
                  />
                );
              })}
            </div>
          </>
        ) : seg.kind === 'amrap' ? (
          <AmrapBlock block={seg.block} />
        ) : null}
      </div>

      {/* Pager esercizi sticky bottom */}
      <nav
        style={{
          position: 'sticky',
          bottom: 0,
          background: '#0A0A0A',
          borderTop: '1px solid var(--gt-border-strong)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
          }}
        >
          <button
            type="button"
            onClick={goPrevSegment}
            disabled={curIdx === 0}
            aria-label="Parte precedente"
            style={{
              padding: 10,
              background: 'transparent',
              border: '1px solid var(--gt-border-strong)',
              borderRadius: 8,
              cursor: curIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: curIdx === 0 ? 0.35 : 1,
              color: '#F0F0F0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            {isLastSegment ? (
              <div
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                  color: ACCENT,
                  textTransform: 'uppercase',
                }}
              >
                Ultima parte
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  Prossimo
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
                    color: ACCENT,
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nextSeg ? segmentLabel(nextSeg) : ''}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleNextOrFinish}
            aria-label={isLastSegment ? 'Concludi e vai a riepilogo' : 'Parte successiva'}
            style={{
              padding: 10,
              background: isLastSegment ? ACCENT : 'transparent',
              border: `1px solid ${isLastSegment ? ACCENT : 'var(--gt-border-strong)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              color: isLastSegment ? '#0D0D0D' : '#F0F0F0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLastSegment ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Timer recupero (overlay floating sopra il pager) — variant 'series'
          perché il trigger è toggleSet(done) = recupero inter-serie dello
          stesso esercizio. Variant 'exercise' (teal) sarà usato in futuro
          se introdurremo un trigger esplicito al cambio esercizio. */}
      {cur && session.restTimerStartedAt != null && (
        <TimerRing
          startedAt={session.restTimerStartedAt}
          targetSec={cur.restTargetSec}
          setNumber={cur.setsDone.length}
          setsTotal={cur.setsTarget}
          exerciseName={cur.name}
          variant="series"
          mode={cur.restMode}
          onStartNext={clearRestTimer}
        />
      )}
    </div>
  );
}

function TargetCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: '14px 12px',
        background: highlight ? ACCENT : 'rgba(255,255,255,0.04)',
        border: `1px solid ${highlight ? ACCENT : 'var(--gt-border-strong)'}`,
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontWeight: 900,
          fontSize: 34, lineHeight: 1,
          letterSpacing: -1,
          color: highlight ? '#0D0D0D' : '#F0F0F0',
          marginBottom: 4,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: highlight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.4)',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SetRow({
  index, reps, load, done, onTap,
}: {
  index: number;
  reps: string;
  load: string;
  done: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={done}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: done ? 'rgba(200,241,53,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${done ? 'rgba(200,241,53,0.45)' : 'var(--gt-border-strong)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 150ms, border-color 150ms',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontWeight: 900, fontSize: 22, lineHeight: 1,
          color: done ? ACCENT : 'rgba(255,255,255,0.45)',
          minWidth: 28,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-barlow)',
          fontWeight: 700, fontSize: 16,
          color: '#F0F0F0',
        }}
      >
        {reps} · {load}
      </span>
      <span
        aria-hidden
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: done ? ACCENT : 'rgba(255,255,255,0.04)',
          border: done ? 'none' : '1px solid var(--gt-border-strong)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    </button>
  );
}
