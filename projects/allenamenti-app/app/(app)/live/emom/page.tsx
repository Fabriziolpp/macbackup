'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type BlinkState = 'off' | 'slow' | 'fast';

function blinkState(t: number): BlinkState {
  if (t < 50) return 'off';
  const phase = t % 60;
  if (phase === 0) return 'fast';
  if (phase <= 49) return 'off';
  if (phase <= 54) return 'slow';
  return 'fast';
}

function fmt2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function EmomPage() {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seriesCount, setSeriesCount] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setTick(x => x + 1), 250);
    const onVis = () => setTick(x => x + 1);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [startedAt]);

  const timerSec = startedAt == null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
  const blink = blinkState(timerSec);

  function handleTap() {
    setSeriesCount(c => c + 1);
    setStartedAt(Date.now());
  }

  function handleClose() {
    router.push('/live');
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        color: '#F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)',
        paddingLeft: 20,
        paddingRight: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Close X */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Chiudi EMOM"
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top) + 12px)',
          right: 16,
          width: 44, height: 44,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '50%',
          color: '#F0F0F0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 30, fontWeight: 900, letterSpacing: 2,
          textTransform: 'uppercase',
          margin: 0,
          marginTop: 8,
        }}
      >
        EMOM Rocker
      </h1>

      {/* Series counter */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 88, fontWeight: 900, letterSpacing: -2, lineHeight: 1,
            color: '#F0F0F0',
          }}
        >
          {fmt2(seriesCount)}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 11, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Serie
        </div>
      </div>

      {/* Big round tap button + +1 badge */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={handleTap}
          aria-label="Tap serie"
          style={{
            width: 120, height: 120,
            borderRadius: '50%',
            background: 'var(--gt-accent)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 12px 32px rgba(200,241,53,0.25), 0 0 0 6px rgba(200,241,53,0.08)',
            color: '#0D0D0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 14, fontWeight: 900, letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          TAP
        </button>

        {seriesCount > 0 && (
          <span
            key={seriesCount}
            aria-hidden
            style={{
              position: 'absolute',
              top: 'calc(50% - 90px)',
              fontFamily: 'var(--font-barlow-condensed)',
              fontSize: 36, fontWeight: 900,
              color: 'var(--gt-accent)',
              pointerEvents: 'none',
              animation: 'emomPlusOne 3s ease-out forwards',
            }}
          >
            +1
          </span>
        )}
      </div>

      {/* Timer */}
      <div
        style={{
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation:
            blink === 'fast' ? 'emomBlink 0.4s ease-in-out infinite' :
            blink === 'slow' ? 'emomBlink 1s ease-in-out infinite' :
            'none',
          color: blink === 'off' ? '#F0F0F0' : 'var(--gt-accent)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 64, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmt2(timerSec)}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 11, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Timer
        </div>
      </div>
    </div>
  );
}
