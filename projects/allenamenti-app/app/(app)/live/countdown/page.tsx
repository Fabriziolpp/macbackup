'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveStore } from '@/lib/liveStore';

const RING_R = 90;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 565.49

export default function LiveCountdownPage() {
  const router = useRouter();
  const session = useLiveStore(s => s.session);
  const hydrated = useLiveStore(s => s.hydrated);
  const hydrate = useLiveStore(s => s.hydrate);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // Se non c'è sessione attiva dopo hydration, rimanda a setup
  useEffect(() => {
    if (hydrated && !session) router.replace('/live');
  }, [hydrated, session, router]);

  // 3 → 2 → 1 → 0 (VAI!) → navigate
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n > 0) {
      const t = setTimeout(() => setN(n - 1), 1000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => router.push('/live/workout'), 900);
    return () => clearTimeout(t);
  }, [n, router]);

  const subtitle = session
    ? [session.schedaNome, session.tipoNome, `${session.week}ª SETT.`].join(' · ')
    : '';

  const showVai = n === 0;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        textAlign: 'center',
      }}
    >
      {/* Top label + subtitle */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top) + 28px)',
          left: 20,
          right: 20,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 12, fontWeight: 600, letterSpacing: 3,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Si parte tra
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              fontSize: 14, fontWeight: 700, letterSpacing: 1.5,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Numero gigante con anello */}
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        {/* Anello SVG (key={n} forza il remount per resettare l'animazione ad ogni tick) */}
        <svg
          key={`ring-${n}`}
          width="220" height="220"
          viewBox="0 0 220 220"
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'rotate(-90deg)',
          }}
          aria-hidden
        >
          <circle
            cx="110" cy="110" r={RING_R}
            fill="none"
            stroke="var(--gt-accent)"
            strokeWidth="2"
            strokeDasharray={RING_CIRC}
            strokeDashoffset="0"
            style={{
              animation: 'ringSweep 0.95s linear forwards',
            }}
          />
        </svg>

        {/* Numero / VAI! */}
        <div
          key={`num-${n}`}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-barlow-condensed)',
            fontWeight: 900,
            fontSize: showVai ? 96 : 180,
            letterSpacing: showVai ? -2 : -6,
            lineHeight: 1,
            color: showVai ? '#F0F0F0' : 'var(--gt-accent)',
            animation: showVai
              ? 'goHeartbeat 0.7s ease infinite'
              : 'countdownPop 1s ease forwards',
          }}
          role={showVai ? 'status' : undefined}
          aria-live={showVai ? 'polite' : undefined}
        >
          {showVai ? 'VAI!' : n}
        </div>
      </div>

      {/* Salta */}
      <button
        type="button"
        onClick={() => router.push('/live/workout')}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom) + 32px)',
          padding: '10px 24px',
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 12, fontWeight: 700, letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
        }}
      >
        Salta
      </button>
    </div>
  );
}
