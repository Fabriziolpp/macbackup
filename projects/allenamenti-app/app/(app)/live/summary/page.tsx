'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveStore } from '@/lib/liveStore';
import { useApp } from '@/providers/AppProvider';
import { buildWorkoutPayload } from '@/lib/buildWorkoutPayload';
import { enqueuePendingWorkout } from '@/lib/idb';
import { newId } from '@/lib/utils';
import ConfirmModal from '@/components/modals/ConfirmModal';

const ACCENT = '#C8F135';

interface Stats {
  durationSec: number;
  setsCompleted: number;
  setsTotal: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  roundsTotal: number;    // FIX6 F2: giri totali loggati nei blocchi AMRAP
  totalLoad?: number;     // F6 SPEC §3.8: predisposto per Q1 (non visualizzato finché non c'è la card)
}

function fmtDurationCompact(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export default function LiveSummaryPage() {
  const router = useRouter();
  const session = useLiveStore(s => s.session);
  const hydrated = useLiveStore(s => s.hydrated);
  const hydrate = useLiveStore(s => s.hydrate);
  const clearSession = useLiveStore(s => s.clearSession);
  const { apiFetch, toast, loadWorkouts } = useApp();

  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (hydrated && !session) router.replace('/live');
  }, [hydrated, session, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const stats = useMemo<Stats | null>(() => {
    if (!session) return null;
    let setsCompleted = 0, setsTotal = 0, exercisesCompleted = 0, exercisesTotal = 0, roundsTotal = 0;
    for (const seg of session.segments) {
      if (seg.kind === 'exercise') {
        const e = seg.exercise;
        setsCompleted += e.setsDone.length;
        setsTotal += e.setsTarget;
        exercisesTotal += 1;
        if (e.setsTarget > 0 && e.setsDone.length >= e.setsTarget) exercisesCompleted += 1;
      } else {
        const b = seg.block;
        exercisesTotal += b.exercises.length;
        roundsTotal += b.rounds.length;
        if (b.rounds.length > 0) exercisesCompleted += b.exercises.length;
      }
    }
    return {
      durationSec: session.totalElapsedSec,
      setsCompleted, setsTotal,
      exercisesCompleted,
      exercisesTotal,
      roundsTotal,
    };
  }, [session]);

  if (!session || !stats) return null;

  async function handleSave() {
    if (saving || !session) return;
    setSaving(true);
    const payload = buildWorkoutPayload({
      session,
      voiceNoteOrTextNote: noteText.trim() || null,
    });
    try {
      const r = await apiFetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let detail = '';
        try { detail = (await r.json())?.error ?? ''; } catch {}
        throw new Error(`HTTP ${r.status}${detail ? ' — ' + detail : ''}`);
      }
      await loadWorkouts();
      await clearSession();
      toast('Allenamento salvato', 'success');
      router.push('/home');
    } catch (err: any) {
      // F6 SPEC §3.6: fallback queue locale per retry al prossimo avvio
      try {
        await enqueuePendingWorkout({
          id: newId(),
          payload: payload as Record<string, any>,
          failedAt: Date.now(),
          retries: 0,
        });
        await clearSession();
        toast('Connessione assente. Dati salvati localmente.', 'info');
        router.push('/home');
      } catch (idbErr: any) {
        // Niente fallback possibile → mostra errore, lascia summary navigabile
        console.error('[summary] enqueue fallita:', idbErr);
        setSaving(false);
        toast(`Errore salvataggio: ${err.message ?? 'sconosciuto'}`, 'error');
      }
    }
  }

  async function handleDiscardConfirm() {
    setDiscarding(false);
    await clearSession();
    router.push('/home');
  }

  const durLabel = fmtDurationCompact(stats.durationSec);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        color: '#F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      {/* HERO */}
      <HeroDark reducedMotion={reducedMotion} subtitle={`${session.schedaNome} · ${session.tipoNome} · ${session.week}ª SETT.`} />

      {/* STATS ROW */}
      <StatsRow stats={stats} durLabel={durLabel} />

      {/* NOTE (textarea fallback finché F7 VoiceRecorder non è pronto) */}
      <NoteSection value={noteText} onChange={setNoteText} />

      {/* AZIONI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: saving ? 'rgba(200,241,53,0.4)' : ACCENT,
            color: '#0D0D0D',
            border: 'none',
            borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 14, fontWeight: 900, letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {saving ? 'Salvataggio…' : 'Salva allenamento'}
        </button>
        <button
          type="button"
          onClick={() => setDiscarding(true)}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'transparent',
            color: 'var(--gt-neg)',
            border: '1px solid var(--gt-neg)',
            borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: 12, fontWeight: 800, letterSpacing: 1.8,
            textTransform: 'uppercase',
            opacity: saving ? 0.5 : 1,
          }}
        >
          Scarta
        </button>
      </div>

      {discarding && (
        <ConfirmModal
          msg="I dati di questa sessione verranno eliminati e non potranno essere recuperati."
          onConfirm={handleDiscardConfirm}
          onClose={() => setDiscarding(false)}
        />
      )}
    </div>
  );
}

function HeroDark({ reducedMotion, subtitle }: { reducedMotion: boolean; subtitle: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '12px 0 24px',
        position: 'relative',
      }}
    >
      {/* Cerchio success + glow (separato dal cerchio per non confliggere con heartbeat) */}
      <div
        style={{
          width: 96, height: 96, borderRadius: '50%',
          background: ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          animation: reducedMotion ? 'none' : 'goHeartbeat 0.8s ease 0.4s 2',
          boxShadow: reducedMotion
            ? 'none'
            : '0 0 0 0 rgba(200,241,53,0.6)',
          // glow secondario via animation infinite (delicato)
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path
            d="M5 13l4 4L19 7"
            style={{
              strokeDasharray: 40,
              strokeDashoffset: reducedMotion ? 0 : 40,
              animation: reducedMotion ? 'none' : 'checkDraw 0.6s ease-out 0.4s forwards',
            }}
          />
        </svg>
      </div>

      {/* Pseudo-glow espandente (riusa glowPulse, 1 ciclo poi statico) */}
      {!reducedMotion && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 12, left: '50%',
            transform: 'translateX(-50%)',
            width: 96, height: 96,
            borderRadius: '50%',
            pointerEvents: 'none',
            animation: 'glowPulse 1s ease-in-out 0.1s 1',
          }}
        />
      )}

      <h1
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 38, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1,
          color: '#F0F0F0',
          margin: 0,
          textTransform: 'uppercase',
        }}
      >
        Allenamento<br />Completato
      </h1>
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 11, fontWeight: 700, letterSpacing: 1.8,
          color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase',
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function StatsRow({ stats, durLabel }: { stats: Stats; durLabel: string }) {
  // FIX6 F2: card "Giri" mostrata se il giorno ha blocchi AMRAP loggati.
  // F6 SPEC §3.8: card "Carico totale" quando Q1 sarà live (stats.totalLoad).
  const showRounds = stats.roundsTotal > 0;
  const cols = 3 + (showRounds ? 1 : 0) + (stats.totalLoad != null ? 1 : 0);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
        marginBottom: 20,
      }}
    >
      <StatCard label="Durata" value={durLabel} />
      <StatCard label="Esercizi" value={`${stats.exercisesCompleted}/${stats.exercisesTotal}`} />
      <StatCard label="Serie" value={`${stats.setsCompleted}/${stats.setsTotal}`} />
      {showRounds && <StatCard label="Giri" value={`${stats.roundsTotal}`} />}
      {stats.totalLoad != null && <StatCard label="Carico tot." value={`${stats.totalLoad} kg`} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '14px 10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--gt-border-strong)',
        borderRadius: 10,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 24, fontWeight: 900, letterSpacing: -0.5,
          color: '#F0F0F0',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function NoteSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // F7 introdurrà il mic VoiceRecorder accanto a questo textarea. Per ora
  // solo textarea: l'utente digita la nota. F7 popolerà lo stesso state via
  // Web Speech API trascrizione.
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          fontSize: 11, fontWeight: 700, letterSpacing: 1.8,
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Note allenamento
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Come è andata? Sensazioni, dolori, PR…"
        style={{
          width: '100%',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--gt-border-strong)',
          borderRadius: 10,
          color: '#F0F0F0',
          fontFamily: 'var(--font-barlow)',
          fontSize: 14, lineHeight: 1.4,
          resize: 'vertical',
          minHeight: 100,
          outline: 'none',
        }}
      />
    </div>
  );
}
