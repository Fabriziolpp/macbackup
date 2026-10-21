'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/providers/AppProvider';
import { schedaColor } from '@/lib/utils';
import {
  toDateString, toTimeString, formatDateIT,
  isoWeek, parseLocalDate, MESI_S, addDays,
} from '@/lib/dateUtils';
import {
  weekWorkouts, currentMonday, weeklyStreak,
  weekLevel, weekMessage,
} from '@/lib/weeklyStats';
import ConfirmModal from '@/components/modals/ConfirmModal';
import WarnModal from '@/components/modals/WarnModal';

const PER_PAGE = 10;
const TARGET = 5;
const ACCENT = '#C8F135';

const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Home', href: '/home' },
  { label: 'Settimana', href: '/settimana' },
  { label: 'Mese', href: '/mese' },
  { label: 'Anno', href: '/anno' },
  { label: 'Schede', href: '/schede' },
];

const LEVEL_LABEL: Record<string, string> = {
  sotto: 'Sotto',
  minimo: 'Minimo',
  ottimale: 'Ottimale',
  super: 'Super',
};

export default function HomePage() {
  const { workouts, schede, apiFetch, loadWorkouts, toast } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const [date, setDate] = useState(toDateString(new Date()));
  const [time, setTime] = useState(toTimeString(new Date()));
  const [schedaNome, setSchedaNome] = useState('');
  const [tipoNome, setTipoNome] = useState('');
  const [durata, setDurata] = useState('60');
  const [noteW, setNoteW] = useState('');
  const [editId, setEditId] = useState('');
  const [recentPage, setRecentPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ msg: string; cb: () => void } | null>(null);
  const [warn, setWarn] = useState<{ msg: string; cb: () => void } | null>(null);

  const sorted = [...workouts].sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));
  const shown = sorted.slice(0, (recentPage + 1) * PER_PAGE);
  const tipi = schede.find(s => s.nome === schedaNome)?.tipi ?? [];

  const mondayStr = currentMonday();
  const mondayDate = parseLocalDate(mondayStr);
  const sundayDate = addDays(mondayDate, 6);
  const weekNum = isoWeek(mondayDate);
  const rangeLabel = `${mondayDate.getDate()} ${MESI_S[mondayDate.getMonth()]} – ${sundayDate.getDate()} ${MESI_S[sundayDate.getMonth()]}`;

  const thisWeek = weekWorkouts(workouts, mondayStr);
  const thisWeekCount = thisWeek.length;
  const level = weekLevel(thisWeekCount);
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  const msg = weekMessage(thisWeekCount, dayOfWeek);
  const streak = weeklyStreak(workouts);
  const slotsFilled = Math.min(thisWeekCount, TARGET);

  const [motivation, setMotivation] = useState<string | null>(null);
  useEffect(() => {
    apiFetch('/api/motivation')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.message) setMotivation(d.message); })
      .catch(() => {});
  }, [workouts.length]);

  useEffect(() => {
    if (editId) setFormOpen(true);
  }, [editId]);

  function resetForm() {
    setDate(toDateString(new Date()));
    setTime(toTimeString(new Date()));
    setSchedaNome(''); setTipoNome(''); setDurata('60'); setNoteW('');
    setEditId('');
  }

  function editWorkout(id: string) {
    const w = workouts.find(x => x.id === id);
    if (!w) return;
    setEditId(id);
    setDate(w.data); setTime(w.ora);
    setSchedaNome(w.scheda); setTipoNome(w.tipo);
    setDurata(String(w.durata)); setNoteW(w.note);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteWorkout(id: string) {
    setConfirm({
      msg: 'Eliminare questo allenamento?',
      cb: async () => {
        await apiFetch('/api/workouts/' + id, { method: 'DELETE' });
        await loadWorkouts();
        setRecentPage(0);
      },
    });
  }

  async function doSave() {
    setSaving(true);
    const body = { data: date, ora: time, scheda: schedaNome, tipo: tipoNome, durata, note: noteW };
    if (editId) {
      await apiFetch('/api/workouts/' + editId, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    } else {
      await apiFetch('/api/workouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    }
    await loadWorkouts();
    setRecentPage(0);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    resetForm();
    toast('Allenamento salvato', 'success');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) {
      const dup = workouts.find(w => w.data === date && w.scheda === schedaNome && w.tipo === tipoNome);
      if (dup) {
        setWarn({
          msg: `Hai già un allenamento "${tipoNome}" il ${formatDateIT(date)}. Vuoi salvarne un altro?`,
          cb: doSave,
        });
        return;
      }
    }
    await doSave();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const canSave = !!date && !!time && !!schedaNome && !!tipoNome && !!durata && !saving;

  return (
    <div className="gt-shell">
      <div className="gt-canvas">

        {/* Nav */}
        <nav className="gt-nav">
          <div className="gt-nav-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 14 Q14 4 24 14 Q14 24 4 14Z" fill={ACCENT} />
              <circle cx="14" cy="14" r="3" fill="#fff" />
            </svg>
          </div>
          <div className="gt-nav-links">
            {NAV_LINKS.map(l => (
              <button
                key={l.href}
                onClick={() => router.push(l.href)}
                className={`gt-nav-link${pathname === l.href ? ' is-active' : ''}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="gt-nav-profile"
            aria-label="Logout"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </nav>

        {/* Hero */}
        <section className="gt-hero">
          <div className="gt-hero-row">
            <div className="gt-hero-label">
              Settimana {weekNum} &nbsp;·&nbsp; {rangeLabel}
            </div>
            <div className={`gt-hero-badge is-${level}`}>
              {LEVEL_LABEL[level] ?? level}
            </div>
          </div>

          <div className="gt-hero-num-wrap">
            <div className="gt-hero-num">{thisWeekCount}</div>
            <div className="gt-hero-goal">/{TARGET}</div>
            <div className="gt-hero-caption">
              <span className="gt-hero-caption-line">allenamenti</span>
              <span className="gt-hero-caption-line">questa settimana</span>
            </div>
          </div>

          <div className="gt-progress" aria-label={`${thisWeekCount} di ${TARGET}`}>
            {Array.from({ length: TARGET }).map((_, i) => (
              <div key={i} className="gt-progress-seg">
                {i < slotsFilled && (
                  <span style={{ animationDelay: `${i * 0.08}s` }} />
                )}
              </div>
            ))}
          </div>

          <div className="gt-hero-footnote">{msg}</div>
        </section>

        {/* Streak */}
        <section className="gt-streak">
          <div className="gt-streak-card">
            <div className="gt-streak-label">Streak</div>
            <div className="gt-streak-value">
              <div className="gt-streak-num">{streak.current}</div>
              <div className="gt-streak-unit">
                {streak.current === 1 ? 'Settimana' : 'Settimane'}
              </div>
            </div>
          </div>
          <div className="gt-streak-card is-accent">
            <div className="gt-streak-label">Record</div>
            <div className="gt-streak-value">
              <div className="gt-streak-num">{streak.record}</div>
              <div className="gt-streak-unit">
                {streak.record === 1 ? 'Settimana' : 'Settimane'}
              </div>
            </div>
          </div>
        </section>

        {motivation && (
          <div className="gt-motiv">{motivation}</div>
        )}

        <hr className="gt-divider" />

        {/* Registra */}
        <section className="gt-registra">
          <div className="gt-registra-head" onClick={() => setFormOpen(o => !o)}>
            <div className="gt-section-head">
              {editId ? 'Modifica' : 'Registra'}
            </div>
            <div className={`gt-registra-chevron${formOpen ? ' is-open' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {formOpen && (
            <form onSubmit={handleSubmit} className="gt-registra-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="gt-label">Data</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="gt-input" required />
                </div>
                <div>
                  <label className="gt-label">Ora</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="gt-input" required />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="gt-label">Scheda</label>
                {schede.length === 0 ? (
                  <p className="gt-empty" style={{ padding: '8px 0', textAlign: 'left' }}>
                    Nessuna scheda disponibile — creane una dalla pagina Schede.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {schede.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSchedaNome(s.nome); setTipoNome(''); }}
                        className={`gt-pill${schedaNome === s.nome ? ' is-selected' : ''}`}
                      >
                        {s.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {schedaNome && (
                <div style={{ marginBottom: 16 }}>
                  <label className="gt-label">Tipo</label>
                  {tipi.length === 0 ? (
                    <p className="gt-empty" style={{ padding: '8px 0', textAlign: 'left' }}>
                      Nessun tipo nella scheda
                    </p>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {tipi.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTipoNome(t.nome)}
                          className={`gt-pill${tipoNome === t.nome ? ' is-selected' : ''}`}
                        >
                          {t.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label className="gt-label">Durata (min)</label>
                  <input
                    type="number" value={durata}
                    onChange={e => setDurata(e.target.value)}
                    className="gt-input" min="1" step="1" required
                  />
                </div>
                <div>
                  <label className="gt-label">Note</label>
                  <input
                    type="text" value={noteW}
                    onChange={e => setNoteW(e.target.value)}
                    className="gt-input" placeholder="Facoltativo"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={!canSave}
                  className={`gt-save-btn${saved ? ' is-saved' : ''}`}
                >
                  {saved ? '✓ Salvato!' : editId ? 'Aggiorna' : 'Salva'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="gt-save-btn is-secondary"
                    style={{ width: 'auto', padding: '14px 24px' }}
                  >
                    Annulla
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        <hr className="gt-divider" />

        {/* Recenti */}
        <section className="gt-recenti">
          <div className="gt-recenti-head">
            <div className="gt-section-head">Recenti</div>
            <div className="gt-section-sub">{sorted.length} totali</div>
          </div>

          {sorted.length === 0 ? (
            <p className="gt-empty">Nessun allenamento registrato</p>
          ) : (
            <div className="gt-recenti-list">
              {shown.map((w, i) => {
                const col = schedaColor(w.scheda);
                return (
                  <article
                    key={w.id}
                    className="gt-card"
                    style={{ animationDelay: `${0.06 * i}s` }}
                  >
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
                      {w.note && (
                        <div className="gt-card-note">&ldquo;{w.note}&rdquo;</div>
                      )}
                    </div>
                    <div className="gt-card-actions">
                      <button type="button" className="gt-card-action" onClick={() => editWorkout(w.id)} aria-label="Modifica">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M10.5 1.5l3 3M2 13l1-4L11.5 1l3 3L6 13H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button type="button" className="gt-card-action is-danger" onClick={() => deleteWorkout(w.id)} aria-label="Elimina">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M3 4h9M6 4V2h3v2M5 4l.5 8M10 4l-.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {shown.length < sorted.length && (
            <button type="button" onClick={() => setRecentPage(p => p + 1)} className="gt-load-more">
              Carica altri
            </button>
          )}
        </section>

        {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.cb} onClose={() => setConfirm(null)} />}
        {warn && <WarnModal msg={warn.msg} onConfirm={warn.cb} onClose={() => setWarn(null)} />}
      </div>
    </div>
  );
}
