'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/providers/AppProvider';
import {
  toDateString, toTimeString, formatDateIT,
  isoWeek, parseLocalDate, MESI, MESI_S, addDays,
} from '@/lib/dateUtils';
import { weekWorkouts, currentMonday, weeklyStreak, weekLevel } from '@/lib/weeklyStats';
import WorkoutCard from '@/components/WorkoutCard';
import ConfirmModal from '@/components/modals/ConfirmModal';
import WarnModal from '@/components/modals/WarnModal';

const TARGET = 5;
const DEFAULT_SHOWN = 3;

const ACCENT = '#C8F135';

const LEVEL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  sotto:    { bg: 'rgba(229,72,77,0.20)',  color: '#FF8F92', label: 'Sotto' },
  minimo:   { bg: 'rgba(200,241,53,0.15)', color: ACCENT,    label: 'Minimo' },
  ottimale: { bg: 'rgba(200,241,53,0.24)', color: ACCENT,    label: 'Ottimale' },
  super:    { bg: ACCENT,                   color: '#0C0C0C', label: 'Super' },
};

function homeDateLabel(w: { data: string; ora: string; durata: number }): string {
  const d = parseLocalDate(w.data);
  const base = `${d.getDate()} ${MESI[d.getMonth()].toLowerCase()}`;
  const parts = [base];
  if (w.ora) parts.push(w.ora);
  parts.push(`${w.durata} min`);
  return parts.join('  ·  ');
}

export default function HomePage() {
  const { workouts, schede, apiFetch, loadWorkouts, toast } = useApp();

  const [date, setDate] = useState(toDateString(new Date()));
  const [time, setTime] = useState(toTimeString(new Date()));
  const [schedaNome, setSchedaNome] = useState('');
  const [tipoNome, setTipoNome] = useState('');
  const [durata, setDurata] = useState('60');
  const [noteW, setNoteW] = useState('');
  const [editId, setEditId] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ msg: string; cb: () => void } | null>(null);
  const [warn, setWarn] = useState<{ msg: string; cb: () => void } | null>(null);

  const sorted = [...workouts].sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora));
  const shown = showAll ? sorted : sorted.slice(0, DEFAULT_SHOWN);
  const tipi = schede.find(s => s.nome === schedaNome)?.tipi ?? [];

  // Weekly stats
  const mondayStr = currentMonday();
  const mondayDate = parseLocalDate(mondayStr);
  const sundayDate = addDays(mondayDate, 6);
  const weekNum = isoWeek(mondayDate);
  const rangeLabel = `${mondayDate.getDate()} ${MESI_S[mondayDate.getMonth()].toLowerCase()} – ${sundayDate.getDate()} ${MESI_S[sundayDate.getMonth()].toLowerCase()}`;

  const thisWeekCount = weekWorkouts(workouts, mondayStr).length;
  const level = weekLevel(thisWeekCount);
  const levelStyle = LEVEL_STYLE[level];
  const streak = weeklyStreak(workouts);
  const slotsFilled = Math.min(thisWeekCount, TARGET);

  useEffect(() => { if (editId) setSheetOpen(true); }, [editId]);

  function resetForm() {
    setDate(toDateString(new Date()));
    setTime(toTimeString(new Date()));
    setSchedaNome(''); setTipoNome(''); setDurata('60'); setNoteW('');
    setEditId('');
  }

  function openNew() { resetForm(); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); resetForm(); }

  function editWorkout(id: string) {
    const w = workouts.find(x => x.id === id);
    if (!w) return;
    setEditId(id);
    setDate(w.data); setTime(w.ora);
    setSchedaNome(w.scheda); setTipoNome(w.tipo);
    setDurata(String(w.durata)); setNoteW(w.note);
  }

  function deleteWorkout(id: string) {
    setConfirm({
      msg: 'Eliminare questo allenamento?',
      cb: async () => {
        await apiFetch('/api/workouts/' + id, { method: 'DELETE' });
        await loadWorkouts();
      },
    });
  }

  async function doSave() {
    setSaving(true);
    const body = { data: date, ora: time, scheda: schedaNome, tipo: tipoNome, durata, note: noteW };
    const r = editId
      ? await apiFetch('/api/workouts/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await apiFetch('/api/workouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json())?.error ?? ''; } catch {}
      toast(`Salvataggio fallito (${r.status})${detail ? ' — ' + detail : ''}`, 'error');
      return;
    }
    await loadWorkouts();
    toast(editId ? 'Allenamento aggiornato' : 'Allenamento salvato', 'success');
    setSheetOpen(false);
    resetForm();
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

  const canSave = !!date && !!time && !!schedaNome && !!tipoNome && !!durata && !saving;

  return (
    <div style={{ padding: '8px 16px 0', minHeight: '100dvh' }}>
      {/* ── Hero black-box ── */}
      <section
        style={{
          background: 'var(--gt-hero-bg)', borderRadius: 24, padding: '22px 22px 18px', marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 12.5, fontWeight: 600, color: 'var(--gt-hero-muted)' }}>
            Settimana {weekNum} · {rangeLabel}
          </div>
          <div
            style={{
              flexShrink: 0, padding: '4px 11px', borderRadius: 999,
              background: levelStyle.bg, color: levelStyle.color,
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 800,
              letterSpacing: 1, textTransform: 'uppercase',
            }}
          >
            {levelStyle.label}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 104, fontWeight: 800, lineHeight: 0.82, letterSpacing: -3, color: '#fff' }}>
            {thisWeekCount}
          </div>
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: -1, color: 'var(--gt-hero-muted)', paddingBottom: 6 }}>
            /{TARGET}
          </div>
          <div style={{ paddingBottom: 10, fontFamily: 'var(--font-barlow)', fontSize: 13, fontWeight: 600, lineHeight: 1.15, textTransform: 'uppercase', color: 'var(--gt-hero-muted)' }}>
            allenamenti<br />questa settimana
          </div>
        </div>

        {/* barre progresso */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {Array.from({ length: TARGET }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
              {i < slotsFilled && (
                <div style={{ height: '100%', background: ACCENT, transformOrigin: 'left', animation: `gtFillBar 0.5s ease ${i * 0.07}s both` }} />
              )}
            </div>
          ))}
        </div>

        {/* strip streak / record */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <StripStat icon="bolt" label="Streak" value={`${streak.current} sett`} />
          <StripStat icon="trophy" label="Record" value={`${streak.record} sett`} />
        </div>
      </section>

      {/* ── CTA Registra (ghost) ── */}
      <button
        type="button"
        onClick={openNew}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', height: 54, marginBottom: 24,
          background: 'var(--gt-card)', border: '1px solid var(--gt-border)', borderRadius: 16,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gt-hero-bg)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </span>
        <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 15.5, fontWeight: 600, color: 'var(--gt-text-primary)' }}>
          Registra allenamento
        </span>
      </button>

      {/* ── Recenti ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 26, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--gt-text-primary)', margin: 0 }}>
          Recenti
        </h2>
        {sorted.length > DEFAULT_SHOWN && (
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-barlow)', fontSize: 13.5, fontWeight: 600, color: 'var(--gt-text-secondary)' }}
          >
            {showAll ? 'Riduci' : `Vedi tutti · ${sorted.length}`}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: showAll ? 'rotate(90deg)' : 'none' }}><path d="M9 6l6 6-6 6" /></svg>
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 14, color: 'var(--gt-text-muted)', fontStyle: 'italic' }}>
          Nessun allenamento registrato.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(w => (
            <WorkoutCard
              key={w.id}
              w={w}
              dateLabel={homeDateLabel(w)}
              onEdit={() => editWorkout(w.id)}
              onDelete={() => deleteWorkout(w.id)}
            />
          ))}
        </div>
      )}

      {/* ── Bottom sheet Registra ── */}
      {sheetOpen && (
        <RegistraSheet
          editing={!!editId}
          date={date} time={time} schedaNome={schedaNome} tipoNome={tipoNome} durata={durata} noteW={noteW}
          schede={schede} tipi={tipi} canSave={canSave} saving={saving}
          onDate={setDate} onTime={setTime}
          onScheda={n => { setSchedaNome(n); setTipoNome(''); }} onTipo={setTipoNome}
          onDurata={setDurata} onNote={setNoteW}
          onSubmit={handleSubmit} onClose={closeSheet}
        />
      )}

      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.cb} onClose={() => setConfirm(null)} />}
      {warn && <WarnModal msg={warn.msg} onConfirm={warn.cb} onClose={() => setWarn(null)} />}
    </div>
  );
}

function StripStat({ icon, label, value }: { icon: 'bolt' | 'trophy'; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--gt-hero-muted)', display: 'flex' }}>
        {icon === 'bolt'
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 4h12v3a6 6 0 01-12 0zM6 6H4a2 2 0 002 4M18 6h2a2 2 0 01-2 4M9 18h6M10 18l1-4h2l1 4M8 21h8" /></svg>}
      </span>
      <span style={{ fontFamily: 'var(--font-barlow)', fontSize: 12.5, fontWeight: 600, color: 'var(--gt-hero-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 20, fontWeight: 700, color: ACCENT }}>{value}</span>
    </div>
  );
}

function RegistraSheet(props: {
  editing: boolean;
  date: string; time: string; schedaNome: string; tipoNome: string; durata: string; noteW: string;
  schede: { id: string; nome: string }[]; tipi: { id: string; nome: string }[];
  canSave: boolean; saving: boolean;
  onDate: (v: string) => void; onTime: (v: string) => void;
  onScheda: (v: string) => void; onTipo: (v: string) => void;
  onDurata: (v: string) => void; onNote: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}) {
  const { editing, date, time, schedaNome, tipoNome, durata, noteW, schede, tipi, canSave, saving } = props;
  return (
    <>
      <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
      <div
        role="dialog" aria-modal="true"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
          background: 'var(--gt-bg)', borderRadius: '26px 26px 0 0',
          padding: '10px 16px calc(24px + env(safe-area-inset-bottom))',
          maxHeight: '90dvh', overflowY: 'auto',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
          animation: 'nk-slide-up 0.3s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--gt-border-strong)', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 27, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--gt-text-primary)', margin: '0 0 18px' }}>
          {editing ? 'Modifica allenamento' : 'Registra allenamento'}
        </h3>

        <form onSubmit={props.onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Labeled label="Data"><input type="date" value={date} onChange={e => props.onDate(e.target.value)} required style={sheetInput} /></Labeled>
            <Labeled label="Ora"><input type="time" value={time} onChange={e => props.onTime(e.target.value)} required style={sheetInput} /></Labeled>
          </div>

          <Labeled label="Scheda">
            {schede.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'var(--gt-text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                Nessuna scheda — creane una in Schede.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {schede.map(s => <Pill key={s.id} label={s.nome} selected={schedaNome === s.nome} onClick={() => props.onScheda(s.nome)} />)}
              </div>
            )}
          </Labeled>

          {schedaNome && (
            <Labeled label="Tipo">
              {tipi.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'var(--gt-text-muted)', fontStyle: 'italic', margin: '4px 0' }}>Nessun tipo nella scheda</p>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tipi.map(t => <Pill key={t.id} label={t.nome} selected={tipoNome === t.nome} onClick={() => props.onTipo(t.nome)} />)}
                </div>
              )}
            </Labeled>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Labeled label="Durata (min)"><input type="number" min="1" step="1" value={durata} onChange={e => props.onDurata(e.target.value)} required style={sheetInput} /></Labeled>
            <Labeled label="Note"><input type="text" value={noteW} onChange={e => props.onNote(e.target.value)} placeholder="Facoltativo" style={sheetInput} /></Labeled>
          </div>

          <button
            type="submit"
            disabled={!canSave}
            style={{
              width: '100%', height: 56, borderRadius: 15, border: 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
              background: canSave ? ACCENT : 'var(--gt-card)',
              color: canSave ? '#0C0C0C' : 'var(--gt-text-muted)',
              fontFamily: 'var(--font-barlow-condensed)', fontSize: 18, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase',
            }}
          >
            {saving ? 'Salvataggio…' : editing ? 'Aggiorna' : 'Salva'}
          </button>
        </form>
      </div>
    </>
  );
}

const sheetInput: React.CSSProperties = {
  width: '100%', height: 48, padding: '0 12px',
  background: 'var(--gt-card)', border: '1px solid var(--gt-border)', borderRadius: 12,
  color: 'var(--gt-text-primary)', fontFamily: 'var(--font-barlow)', fontSize: 15, outline: 'none',
};

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-barlow)', fontSize: 12.5, fontWeight: 600, color: 'var(--gt-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        padding: '9px 14px', borderRadius: 999, cursor: 'pointer', minHeight: 44,
        background: selected ? 'var(--gt-hero-bg)' : 'var(--gt-card)',
        border: `1px solid ${selected ? 'var(--gt-hero-bg)' : 'var(--gt-border)'}`,
        color: selected ? ACCENT : 'var(--gt-text-primary)',
        fontFamily: 'var(--font-barlow)', fontSize: 14, fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}
