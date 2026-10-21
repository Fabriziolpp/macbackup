'use client';

import { useEffect, useRef, useState } from 'react';

const RING_R = 26;
const RING_CIRC = 2 * Math.PI * RING_R;

export type TimerVariant = 'series' | 'exercise';
export type TimerMode = 'countdown' | 'stopwatch';

interface Props {
  startedAt: number;            // epoch ms (session.restTimerStartedAt)
  targetSec: number;            // target di recupero in secondi (session.exercises[cur].restTargetSec)
  setNumber: number;            // serie appena completata (1-based)
  setsTotal: number;            // serie totali dell'esercizio corrente
  exerciseName: string;
  variant?: TimerVariant;       // FIX5 SPEC §2.2: 'series' (amber) default, 'exercise' (teal)
  mode?: TimerMode;             // FIX5b: 'countdown' (default) o 'stopwatch' (count-up, "Completo")
  onStartNext: () => void;      // chiama clearRestTimer dello store
}

const VARIANT_STYLE: Record<TimerVariant, { color: string; label: string }> = {
  series:   { color: 'var(--gt-timer-series)',   label: 'Recupero serie' },
  exercise: { color: 'var(--gt-timer-exercise)', label: 'Recupero esercizio' },
};

function fmtMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function TimerRing({
  startedAt, targetSec, setNumber, setsTotal, exerciseName, variant = 'series', mode = 'countdown', onStartNext,
}: Props) {
  const isStopwatch = mode === 'stopwatch';
  const [, forceTick] = useState(0);
  const [targetOverride, setTargetOverride] = useState<number>(targetSec);
  const vibrated = useRef(false);

  // Reset override + vibrazione al cambio di timer instance (nuovo startedAt)
  useEffect(() => {
    setTargetOverride(targetSec);
    vibrated.current = false;
  }, [startedAt, targetSec]);

  // Re-render ogni 250ms + recupero drift al ritorno foreground
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 250);
    const onVis = () => {
      if (document.visibilityState === 'visible') forceTick(t => t + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [startedAt]);

  const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const effectiveTarget = Math.max(0, targetOverride);
  // FIX5b: in stopwatch non c'è target → nessun "raggiunto", nessun glow/vibrazione.
  const reachedTarget = !isStopwatch && effectiveTarget > 0 && elapsedSec >= effectiveTarget;

  // Vibrazione singola a effectiveTarget - 10s (one-shot per timer instance).
  // Si adatta a override: se l'utente sposta il target, la vibrazione segue.
  const vibrateAt = Math.max(0, effectiveTarget - 10);
  useEffect(() => {
    if (!isStopwatch && !vibrated.current && effectiveTarget > 0 && elapsedSec >= vibrateAt && elapsedSec < effectiveTarget) {
      vibrated.current = true;
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(200);
        }
      } catch {
        // Safari iOS web non supporta vibrate — silenzioso.
      }
    }
  }, [elapsedSec, vibrateAt, effectiveTarget]);

  // F8: notifica locale a fine recupero per chi ha l'app in background (la
  // vibrazione sopra parte solo a schermo attivo). Notification API minimale,
  // niente service worker (push completo → R3). Si rischedula se l'utente cambia
  // il target con gli override ±15".
  useEffect(() => {
    if (isStopwatch || effectiveTarget <= 0) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const fireInMs = startedAt + effectiveTarget * 1000 - Date.now();
    if (fireInMs <= 0) return;
    const id = setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;
      if (Notification.permission !== 'granted') return;
      try {
        new Notification('Recupero finito', {
          body: `${exerciseName} — pronti per la prossima serie`,
          tag: 'gt-rest-timer',
        });
      } catch {
        // Costruttore Notification non disponibile (es. alcuni WKWebView) — silenzioso.
      }
    }, fireInMs);
    return () => clearTimeout(id);
  }, [startedAt, effectiveTarget, isStopwatch, exerciseName]);

  // Ring fill: 0 → 100% al raggiungimento del target effettivo, poi resta pieno.
  // FIX5b: in stopwatch non c'è progresso da mostrare → anello vuoto (solo traccia).
  const fillPct = isStopwatch ? 0 : (effectiveTarget > 0 ? Math.min(elapsedSec / effectiveTarget, 1) : 0);
  const dashOffset = RING_CIRC * (1 - fillPct);

  const variantStyle = VARIANT_STYLE[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(78px + env(safe-area-inset-bottom))', // sopra il pager
        zIndex: 40,
        background: variantStyle.color,
        color: '#0D0D0D',
        borderRadius: 12,
        padding: '14px 16px 10px',
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto',
        gridTemplateRows: 'auto auto',
        alignItems: 'center',
        columnGap: 14,
        rowGap: 8,
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        animation: reachedTarget ? 'glowPulse 1.4s ease-in-out infinite' : 'none',
      }}
    >
      {/* Ring SVG + numero centrale */}
      <div style={{ position: 'relative', width: 64, height: 64, gridRow: '1' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden>
          <circle
            cx="32" cy="32" r={RING_R}
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="3"
          />
          <circle
            cx="32" cy="32" r={RING_R}
            fill="none"
            stroke="#0D0D0D"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 240ms linear' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: elapsedSec >= 600 ? 16 : 20,
            fontWeight: 900,
            color: '#0D0D0D',
            letterSpacing: -0.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtMMSS(elapsedSec)}
        </div>
      </div>

      {/* Label */}
      <div style={{ minWidth: 0, gridRow: '1' }}>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 11, fontWeight: 800, letterSpacing: 1.8,
            color: 'rgba(0,0,0,0.65)',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {isStopwatch ? `${variantStyle.label} · a sensazione` : `${variantStyle.label} · target ${effectiveTarget}s`}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
            color: '#0D0D0D',
            textTransform: 'uppercase',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Serie {setNumber}/{setsTotal} · {exerciseName}
        </div>
      </div>

      {/* Start Next button */}
      <button
        type="button"
        onClick={onStartNext}
        style={{
          padding: '10px 14px',
          background: '#0D0D0D',
          color: variantStyle.color,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          gridRow: '1',
        }}
      >
        Start Next
      </button>

      {/* Bottoni override ±15" (FIX5 SPEC §2.3) — riga 2 sotto, distribuiti ai lati.
          FIX5b: nascosti in stopwatch (nessun target da regolare). */}
      {!isStopwatch && (
        <div
          style={{
            gridColumn: '1 / -1',
            gridRow: '2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <AdjustButton label="−15″" onClick={() => setTargetOverride(t => Math.max(0, t - 15))} />
          <AdjustButton label="+15″" onClick={() => setTargetOverride(t => t + 15)} />
        </div>
      )}
    </div>
  );
}

function AdjustButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 44, minHeight: 44,
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.18)',
        color: '#0D0D0D',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'var(--font-barlow-condensed)',
        fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </button>
  );
}
