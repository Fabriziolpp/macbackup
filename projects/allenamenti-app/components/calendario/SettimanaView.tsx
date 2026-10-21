'use client';

import { useState } from 'react';
import { useApp } from '@/providers/AppProvider';
import {
  toDateString, parseLocalDate, isoWeek, MESI_S, addDays, getMonday,
} from '@/lib/dateUtils';
import WorkoutCard from '@/components/WorkoutCard';

const ACCENT = '#C8F135';
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function agendaDateLabel(data: string): string {
  const d = parseLocalDate(data);
  const dow = DAYS[(d.getDay() + 6) % 7];
  return `${dow} ${d.getDate()} ${MESI_S[d.getMonth()].toLowerCase()}`;
}

export default function SettimanaView() {
  const { workouts } = useApp();
  const [offset, setOffset] = useState(0);

  const today = new Date();
  const monday = addDays(getMonday(today), offset * 7);
  const sunday = addDays(monday, 6);
  const wn = isoWeek(monday);
  const rangeLabel = `${monday.getDate()} ${MESI_S[monday.getMonth()].toLowerCase()} – ${sunday.getDate()} ${MESI_S[sunday.getMonth()].toLowerCase()} ${sunday.getFullYear()}`;
  const fromStr = toDateString(monday);
  const toStr = toDateString(sunday);
  const isCurrent = offset === 0;

  const weekWos = workouts
    .filter(w => w.data >= fromStr && w.data <= toStr)
    .sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));

  const totalMin = weekWos.reduce((s, w) => s + Number(w.durata || 0), 0);
  const avgMin = weekWos.length ? Math.round(totalMin / weekWos.length) : 0;

  const dayMinutes = Array.from({ length: 7 }, (_, i) =>
    weekWos
      .filter(w => ((parseLocalDate(w.data).getDay() + 6) % 7) === i)
      .reduce((s, w) => s + Number(w.durata || 0), 0)
  );

  return (
    <>
      {/* Hero black-box: week nav + stats + strip giorni */}
      <section style={{ background: 'var(--gt-hero-bg)', borderRadius: 24, padding: 18, marginBottom: 20 }}>
        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
          <NavArrow dir="prev" onClick={() => setOffset(o => o - 1)} enabled />
          <div style={{ textAlign: 'center', minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: 'var(--gt-hero-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
              Settimana {wn}
            </div>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 23, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {rangeLabel}
            </div>
            {isCurrent && (
              <div style={{ marginTop: 6, display: 'inline-block', color: ACCENT, border: `1px solid ${ACCENT}66`, borderRadius: 999, fontFamily: 'var(--font-barlow)', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: '2px 9px', textTransform: 'uppercase' }}>
                Settimana corrente
              </div>
            )}
          </div>
          <NavArrow dir="next" onClick={() => setOffset(o => o + 1)} enabled={offset < 0} />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <Stat label="Allenamenti" value={String(weekWos.length)} />
          <Stat label="Minuti totali" value={String(totalMin)} />
          <Stat label="Media durata" value={avgMin ? `${avgMin}'` : '—'} />
        </div>

        {/* Strip giorni */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {DAYS.map((d, i) => {
            const worked = dayMinutes[i] > 0;
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: worked ? ACCENT : 'var(--gt-hero-muted)', textTransform: 'uppercase' }}>
                  {d}
                </div>
                <div
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12,
                    border: worked ? `1px solid ${ACCENT}80` : '1px solid rgba(255,255,255,0.08)',
                    background: worked ? `${ACCENT}12` : 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  }}
                >
                  {worked && (
                    <>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
                      <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700, color: '#fff' }}>{dayMinutes[i]}'</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lista allenamenti */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 26, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--gt-text-primary)', margin: 0 }}>
          Allenamenti
        </h2>
        <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 13.5, fontWeight: 600, color: 'var(--gt-text-secondary)' }}>
          {weekWos.length} questa settimana
        </span>
      </div>

      {weekWos.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, color: 'var(--gt-text-muted)', fontStyle: 'italic' }}>
          Nessun allenamento questa settimana.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Lista read-only in Agenda: modifica/elimina si fanno da Home. */}
          {weekWos.map(w => (
            <WorkoutCard key={w.id} w={w} dateLabel={agendaDateLabel(w.data)} />
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 46, fontWeight: 800, lineHeight: 0.82, letterSpacing: -1.5, color: '#fff' }}>
        {value}
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font-barlow)', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: 'var(--gt-hero-muted)', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function NavArrow({ dir, onClick, enabled }: { dir: 'prev' | 'next'; onClick: () => void; enabled: boolean }) {
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      aria-label={dir === 'prev' ? 'Settimana precedente' : 'Settimana successiva'}
      style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: 12,
        background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
        color: enabled ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)',
        cursor: enabled ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}
