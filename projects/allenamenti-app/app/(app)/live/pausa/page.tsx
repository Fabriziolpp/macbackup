'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveStore } from '@/lib/liveStore';

export default function LivePausaPage() {
  const router = useRouter();
  const session = useLiveStore(s => s.session);
  const hydrated = useLiveStore(s => s.hydrated);
  const hydrate = useLiveStore(s => s.hydrate);
  const resumeSession = useLiveStore(s => s.resumeSession);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (hydrated && !session) router.replace('/live');
  }, [hydrated, session, router]);

  if (!session) return null;

  function handleResume() {
    resumeSession();
    router.push('/live/workout');
  }

  function handleTermina() {
    router.push('/live/summary');
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        color: '#F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(env(safe-area-inset-top) + 32px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)',
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Header — solo context */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Sessione in pausa
        </div>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 22, fontWeight: 800, letterSpacing: 0.5,
            color: '#F0F0F0',
            textTransform: 'uppercase',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.schedaNome} · {session.tipoNome}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
          }}
        >
          Parte {session.currentSegmentIdx + 1}/{session.segments.length}
        </div>
      </div>

      {/* Spazio centrale con i 2 bottoni */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <button
          type="button"
          onClick={handleResume}
          aria-label="Riprendi allenamento"
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'var(--gt-accent)',
            color: '#0D0D0D',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 12px 40px rgba(200,241,53,0.28), 0 0 0 8px rgba(200,241,53,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Stessa icona play del FAB Live in home */}
          <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <div
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 16, fontWeight: 800, letterSpacing: 2.5,
            color: '#F0F0F0',
            textTransform: 'uppercase',
            marginTop: -4,
          }}
        >
          Riprendi
        </div>

        <button
          type="button"
          onClick={handleTermina}
          style={{
            marginTop: 24,
            padding: '18px 40px',
            background: 'transparent',
            color: '#F0F0F0',
            border: '1px solid var(--gt-border-strong)',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 14, fontWeight: 900, letterSpacing: 2.5,
            textTransform: 'uppercase',
            minWidth: 200,
          }}
        >
          Termina
        </button>
      </div>
    </div>
  );
}
