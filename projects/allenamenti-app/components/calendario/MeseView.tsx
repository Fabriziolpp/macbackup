'use client';

import { useState } from 'react';
import { useApp } from '@/providers/AppProvider';
import { schedaColor } from '@/lib/utils';
import { MESI, formatDateIT } from '@/lib/dateUtils';

const ACCENT = '#C8F135';
const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

type Workout = {
  id: string;
  data: string;
  ora: string;
  scheda: string;
  tipo: string;
  durata: number;
  note: string;
};

export default function MeseView() {
  const { workouts } = useApp();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<'minuti' | 'sessioni'>('minuti');

  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const ty = target.getFullYear();
  const tm = target.getMonth();
  const prefix = `${ty}-${String(tm + 1).padStart(2, '0')}`;
  const isCurrent = offset === 0;

  const monthWos: Workout[] = workouts
    .filter(w => w.data.startsWith(prefix))
    .sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));

  const totalMin = monthWos.reduce((s, w) => s + Number(w.durata || 0), 0);
  const avgMin = monthWos.length ? Math.round(totalMin / monthWos.length) : 0;

  const workoutByDay: Record<number, Workout[]> = {};
  monthWos.forEach(w => {
    const day = parseInt(w.data.slice(8, 10), 10);
    if (!workoutByDay[day]) workoutByDay[day] = [];
    workoutByDay[day].push(w);
  });

  const daysInMonth = new Date(ty, tm + 1, 0).getDate();
  const firstDow = (new Date(ty, tm, 1).getDay() + 6) % 7;
  const numWeeks = Math.ceil((firstDow + daysInMonth) / 7);

  const grid: (number | null)[][] = [];
  for (let w = 0; w < numWeeks; w++) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const dayNum = w * 7 + d - firstDow + 1;
      week.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
    }
    grid.push(week);
  }

  const maxDayMin = Math.max(
    1,
    ...Object.values(workoutByDay).map(ws => ws.reduce((s, w) => s + Number(w.durata || 0), 0))
  );

  const todayDay = isCurrent ? today.getDate() : null;

  const weekTotals = grid.map(week => {
    const validDays = week.filter((d): d is number => d !== null);
    const wos = monthWos.filter(w => validDays.includes(parseInt(w.data.slice(8, 10), 10)));
    const first = validDays[0];
    const last = validDays[validDays.length - 1];
    return {
      count: wos.length,
      minutes: wos.reduce((s, w) => s + Number(w.durata || 0), 0),
      range: validDays.length > 0 ? `${first}–${last}` : '',
    };
  });
  const maxWeekVal = Math.max(
    1,
    ...weekTotals.map(w => (mode === 'minuti' ? w.minutes : w.count))
  );

  const arrowBtn = (active: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: active ? 'pointer' : 'default',
    color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
    padding: '6px 10px', borderRadius: 4, display: 'flex', alignItems: 'center',
  });

  return (
    <>
      {/* Hero: month nav + metrics + heatmap */}
      <section className="gt-hero" style={{ padding: '28px 28px 32px' }}>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={() => setOffset(o => o - 1)} style={arrowBtn(true)} aria-label="Precedente">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>
              Mese
            </div>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 18, fontWeight: 700, letterSpacing: 0.5, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
              {MESI[tm]} {ty}
            </div>
            {isCurrent && (
              <div style={{ marginTop: 6, display: 'inline-block', background: `${ACCENT}22`, color: ACCENT, fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                Mese corrente
              </div>
            )}
          </div>
          <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} style={arrowBtn(offset < 0)} aria-label="Successivo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* 3 metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
          <Metric label="Allenamenti" value={monthWos.length} />
          <Metric label="Minuti totali" value={totalMin} />
          <Metric label="Media durata" value={avgMin ? `${avgMin}′` : '—'} small={!avgMin} />
        </div>

        {/* Heatmap calendar */}
        <Heatmap grid={grid} workoutByDay={workoutByDay} maxDayMin={maxDayMin} todayDay={todayDay} />

        {monthWos.length === 0 && (
          <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Nessun allenamento registrato questo mese.
          </div>
        )}
      </section>

      <hr className="gt-divider" />

      {/* Weekly progress */}
      <section style={{ padding: '28px 28px 8px', animation: 'gtFadeUp 0.5s ease 0.15s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div className="gt-section-head">Progresso</div>
          <div style={{ display: 'flex', background: 'var(--gt-input-bg)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--gt-border)' }}>
            {(['minuti', 'sessioni'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1.5, textTransform: 'uppercase',
                  background: mode === m ? 'var(--gt-accent)' : 'transparent',
                  color: mode === m ? '#0D0D0D' : 'var(--gt-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'minuti' ? 'Min' : 'Sessioni'}
              </button>
            ))}
          </div>
        </div>
        <WeeklyBars weekTotals={weekTotals} mode={mode} maxVal={maxWeekVal} />
      </section>

      <hr className="gt-divider" style={{ margin: '20px 28px 0' }} />

      {/* Workout list */}
      <section style={{ padding: '28px 28px 40px', animation: 'gtFadeUp 0.5s ease 0.2s both' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="gt-section-head">Allenamenti</div>
          <div className="gt-section-sub">
            {monthWos.length} {monthWos.length === 1 ? 'totale' : 'totali'}
          </div>
        </div>
        {monthWos.length === 0 ? (
          <p className="gt-empty">Nessun allenamento questo mese</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {monthWos.map((w, i) => {
              const col = schedaColor(w.scheda);
              return (
                <article key={w.id} className="gt-card" style={{ animationDelay: `${0.04 * i}s` }}>
                  <div className="gt-card-stripe" style={{ background: col.text }} />
                  <div className="gt-card-content">
                    <div className="gt-card-top">
                      <div className="gt-card-taggroup">
                        <span className="gt-card-tag" style={{ background: col.bg, color: col.text }}>
                          {w.scheda}
                        </span>
                        <span className="gt-card-giorno">{w.tipo}</span>
                      </div>
                      <div className="gt-card-durata">{w.durata} min</div>
                    </div>
                    <div className="gt-card-meta">
                      {formatDateIT(w.data)}{w.ora ? ` · ${w.ora}` : ''}
                    </div>
                    {w.note && <div className="gt-card-note">&ldquo;{w.note}&rdquo;</div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function Metric({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  const s = String(value);
  const size = small ? 48 : s.length > 3 ? 52 : s.length > 2 ? 56 : 68;
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-barlow-condensed)', fontWeight: 900,
        fontSize: size, lineHeight: 0.9, color: '#F0F0F0',
        letterSpacing: -2, marginBottom: 8,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 600,
        letterSpacing: 2, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

function Heatmap({
  grid, workoutByDay, maxDayMin, todayDay,
}: {
  grid: (number | null)[][];
  workoutByDay: Record<number, Workout[]>;
  maxDayMin: number;
  todayDay: number | null;
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 700,
            letterSpacing: 1, color: 'rgba(255,255,255,0.25)',
            textAlign: 'center', textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {grid.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ height: 36 }} />;
              const wos = workoutByDay[day];
              const dayMin = wos ? wos.reduce((s, w) => s + Number(w.durata || 0), 0) : 0;
              const intensity = wos ? Math.min(dayMin / maxDayMin, 1) : 0;
              const alpha = Math.round(intensity * 0.9 * 255).toString(16).padStart(2, '0');
              const isToday = day === todayDay;
              return (
                <div
                  key={di}
                  style={{
                    height: 36, borderRadius: 4, position: 'relative', overflow: 'hidden',
                    background: wos ? `${ACCENT}${alpha}` : 'rgba(255,255,255,0.05)',
                    border: isToday
                      ? `1.5px solid ${ACCENT}`
                      : wos
                        ? `1px solid ${ACCENT}44`
                        : '1px solid rgba(255,255,255,0.06)',
                  }}
                  title={wos ? `${day}: ${wos.length} allenam. · ${dayMin} min` : String(day)}
                >
                  <div style={{
                    position: 'absolute', top: 4, left: 6,
                    fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700,
                    color: wos ? ACCENT : 'rgba(255,255,255,0.3)', lineHeight: 1,
                  }}>
                    {day}
                  </div>
                  {wos && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                      background: ACCENT, transformOrigin: 'left',
                      animation: 'gtFillBar 0.3s ease both',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyBars({
  weekTotals, mode, maxVal,
}: {
  weekTotals: { count: number; minutes: number; range: string }[];
  mode: 'minuti' | 'sessioni';
  maxVal: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
      {weekTotals.map((w, i) => {
        const val = mode === 'minuti' ? w.minutes : w.count;
        const pct = maxVal > 0 ? val / maxVal : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700,
              color: val > 0 ? 'var(--gt-text-primary)' : 'var(--gt-text-muted)',
              minHeight: 14,
            }}>
              {val > 0 ? val : ''}
            </div>
            <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${Math.max(pct * 80, val > 0 ? 4 : 0)}px`,
                background: val > 0 ? 'var(--gt-accent)' : 'var(--gt-input-bg)',
                borderRadius: '3px 3px 0 0',
                opacity: val > 0 ? 1 : 0.5,
                animation: val > 0 ? `gtFadeUp 0.5s ease ${i * 0.06}s both` : 'none',
              }} />
            </div>
            <div style={{
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 600,
              letterSpacing: 0.5, color: 'var(--gt-text-muted)',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              {w.range}
            </div>
          </div>
        );
      })}
    </div>
  );
}
