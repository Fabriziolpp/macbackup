'use client';

import { useState } from 'react';
import { useApp } from '@/providers/AppProvider';
import { schedaColor } from '@/lib/utils';
import { MESI, MESI_S, formatDateIT } from '@/lib/dateUtils';

const ACCENT = '#C8F135';

type Workout = {
  id: string;
  data: string;
  ora: string;
  scheda: string;
  tipo: string;
  durata: number;
  note: string;
};

export default function AnnoView() {
  const { workouts } = useApp();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<'minuti' | 'sessioni'>('minuti');

  const today = new Date();
  const ty = today.getFullYear() + offset;
  const prefix = `${ty}-`;
  const isCurrentYear = offset === 0;
  const currentMonth = isCurrentYear ? today.getMonth() : -1;

  const filtered: Workout[] = workouts
    .filter(w => w.data.startsWith(prefix))
    .sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));

  const totalMin = filtered.reduce((s, w) => s + Number(w.durata || 0), 0);

  const monthStats = Array.from({ length: 12 }, (_, i) => {
    const wos = filtered.filter(w => parseInt(w.data.slice(5, 7), 10) - 1 === i);
    return {
      idx: i,
      label: MESI_S[i],
      count: wos.length,
      minutes: wos.reduce((s, w) => s + Number(w.durata || 0), 0),
    };
  });
  const activeMonths = monthStats.filter(m => m.count > 0).length;

  const maxMonthMin = Math.max(1, ...monthStats.map(m => m.minutes));
  const maxMonthVal = Math.max(
    1,
    ...monthStats.map(m => (mode === 'minuti' ? m.minutes : m.count))
  );

  const activeMonthsList = monthStats.filter(m => m.count > 0).slice().reverse();

  const arrowBtn = (active: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: active ? 'pointer' : 'default',
    color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
    padding: '6px 10px', borderRadius: 4, display: 'flex', alignItems: 'center',
  });

  return (
    <>
      {/* Hero: year nav + metrics + 12-month strip */}
      <section className="gt-hero" style={{ padding: '28px 28px 32px' }}>

        {/* Year nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={() => setOffset(o => o - 1)} style={arrowBtn(true)} aria-label="Precedente">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>
              Anno
            </div>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>
              {ty}
            </div>
            {isCurrentYear && (
              <div style={{ marginTop: 6, display: 'inline-block', background: `${ACCENT}22`, color: ACCENT, fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                Anno corrente
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
          <Metric label="Allenamenti" value={filtered.length} />
          <Metric label="Minuti totali" value={totalMin} />
          <Metric label="Mesi attivi" value={activeMonths} />
        </div>

        {/* 12-month strip */}
        <YearStrip monthStats={monthStats} maxMinutes={maxMonthMin} currentMonth={currentMonth} />

        {filtered.length === 0 && (
          <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Nessun allenamento registrato quest&apos;anno.
          </div>
        )}
      </section>

      <hr className="gt-divider" />

      {/* Monthly progress chart */}
      <section style={{ padding: '28px 28px 8px', animation: 'gtFadeUp 0.5s ease 0.1s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div className="gt-section-head">Progressi</div>
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
        <MonthlyBars monthStats={monthStats} mode={mode} maxVal={maxMonthVal} />
      </section>

      <hr className="gt-divider" style={{ margin: '20px 28px 0' }} />

      {/* Monthly summary */}
      <section style={{ padding: '24px 28px 8px', animation: 'gtFadeUp 0.5s ease 0.15s both' }}>
        <div className="gt-section-head" style={{ marginBottom: 14 }}>Riepilogo mensile</div>
        {activeMonthsList.length === 0 ? (
          <p className="gt-empty" style={{ padding: '24px 0' }}>Nessun dato</p>
        ) : (
          <div>
            {activeMonthsList.map((m, i) => (
              <div
                key={m.idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < activeMonthsList.length - 1 ? '1px solid var(--gt-border)' : 'none',
                  animation: `gtFadeUp 0.35s ease ${i * 0.05}s both`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 4, height: 32, borderRadius: 2,
                    background: ACCENT,
                    opacity: 0.5 + (m.idx / 11) * 0.5,
                  }} />
                  <div style={{
                    fontFamily: 'var(--font-barlow-condensed)', fontWeight: 700, fontSize: 16,
                    letterSpacing: 0.5, color: 'var(--gt-text-primary)', textTransform: 'uppercase',
                  }}>
                    {MESI[m.idx]} {ty}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, fontSize: 22,
                      color: 'var(--gt-text-primary)', letterSpacing: -0.5,
                    }}>
                      {m.count}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 600,
                      letterSpacing: 1.5, color: 'var(--gt-text-muted)', textTransform: 'uppercase',
                    }}>
                      all.
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 56 }}>
                    <div style={{
                      fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, fontSize: 22,
                      color: 'var(--gt-accent)', letterSpacing: -0.5,
                    }}>
                      {m.minutes}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 600,
                      letterSpacing: 1.5, color: 'var(--gt-text-muted)', textTransform: 'uppercase',
                    }}>
                      min
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="gt-divider" style={{ margin: '8px 28px 0' }} />

      {/* Workout list */}
      <section style={{ padding: '28px 28px 40px', animation: 'gtFadeUp 0.5s ease 0.2s both' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="gt-section-head">Allenamenti</div>
          <div className="gt-section-sub">
            {filtered.length} {filtered.length === 1 ? 'totale' : 'totali'}
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="gt-empty">Nessun allenamento quest&apos;anno</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((w, i) => {
              const col = schedaColor(w.scheda);
              return (
                <article key={w.id} className="gt-card" style={{ animationDelay: `${Math.min(0.03 * i, 0.6)}s` }}>
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

function Metric({ label, value }: { label: string; value: number | string }) {
  const s = String(value);
  const size = s.length > 3 ? 52 : s.length > 2 ? 56 : 68;
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

function YearStrip({
  monthStats, maxMinutes, currentMonth,
}: {
  monthStats: { idx: number; label: string; count: number; minutes: number }[];
  maxMinutes: number;
  currentMonth: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4 }}>
      {monthStats.map(m => {
        const active = m.count > 0;
        const intensity = maxMinutes > 0 ? m.minutes / maxMinutes : 0;
        const alpha = Math.round((0.15 + intensity * 0.75) * 255).toString(16).padStart(2, '0');
        const isCurrent = m.idx === currentMonth;
        return (
          <div key={m.idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                height: 56, borderRadius: 4,
                background: active ? `${ACCENT}${alpha}` : 'rgba(255,255,255,0.05)',
                border: isCurrent
                  ? `1.5px solid ${ACCENT}`
                  : active
                    ? `1px solid ${ACCENT}44`
                    : '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
              title={active ? `${m.label}: ${m.count} all. · ${m.minutes} min` : m.label}
            >
              {active && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-barlow-condensed)', fontSize: 14, fontWeight: 800,
                    color: ACCENT, lineHeight: 1,
                  }}>
                    {m.count}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-barlow-condensed)', fontSize: 9, fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    {Math.round(m.minutes / 60)}h
                  </div>
                </>
              )}
            </div>
            <div style={{
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 700,
              letterSpacing: 0.5,
              color: active ? ACCENT : 'rgba(255,255,255,0.25)',
              textAlign: 'center', textTransform: 'uppercase',
            }}>
              {m.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBars({
  monthStats, mode, maxVal,
}: {
  monthStats: { idx: number; label: string; count: number; minutes: number }[];
  mode: 'minuti' | 'sessioni';
  maxVal: number;
}) {
  const chartH = 120;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: chartH + 40 }}>
      {monthStats.map((m, i) => {
        const val = mode === 'minuti' ? m.minutes : m.count;
        const pct = maxVal > 0 ? val / maxVal : 0;
        const barH = Math.max(pct * chartH, val > 0 ? 4 : 0);
        return (
          <div key={m.idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 700,
              color: val > 0 ? 'var(--gt-text-primary)' : 'var(--gt-text-muted)',
              minHeight: 14,
            }}>
              {val > 0 ? val : ''}
            </div>
            <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${barH}px`,
                background: val > 0 ? 'var(--gt-accent)' : 'var(--gt-input-bg)',
                borderRadius: '3px 3px 0 0',
                opacity: val > 0 ? 1 : 0.3,
                animation: val > 0 ? `gtFadeUp 0.5s ease ${i * 0.04}s both` : 'none',
              }} />
            </div>
            <div style={{
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 10, fontWeight: 600,
              letterSpacing: 0.3,
              color: val > 0 ? 'var(--gt-text-secondary)' : 'var(--gt-text-muted)',
              textTransform: 'uppercase',
            }}>
              {m.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
