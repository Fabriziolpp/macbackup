'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp, Scheda, Tipo, Esercizio, Blocco, tipoEsercizi } from '@/providers/AppProvider';

// Iniziali per la cover monocroma della scheda: 1 lettera se una parola,
// 2 se più parole (es. "Giugno - Casa" → "GC", "Giugno" → "G").
function schedaInitials(nome: string): string {
  const words = (nome || '').split(/[^A-Za-zÀ-ÿ0-9]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
import SchedaModal from '@/components/modals/SchedaModal';
import TipoModal from '@/components/modals/TipoModal';
import EsercizioModal from '@/components/modals/EsercizioModal';
import StoricoPesiModal from '@/components/modals/StoricoPesiModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import ReorderModal from '@/components/modals/ReorderModal';

const ACCENT = '#C8F135';

type ModalState =
  | { type: 'scheda';    schedaId?: string }
  | { type: 'duplica';   schedaId: string }
  | { type: 'tipo';      schedaId: string; tipoId?: string }
  | { type: 'esercizio'; schedaId: string; tipoId: string; esId?: string }
  | { type: 'reorder';   schedaId: string; tipoId: string }
  | { type: 'storico';   esNome: string }
  | { type: 'confirm';   msg: string; cb: () => void };

export default function SchedeArchivioPage() {
  const { schede, apiFetch, loadSchede, toast, activeScheda, setActiveSchedaId } = useApp();

  const [modal, setModal] = useState<ModalState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropOver, setDropOver] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);   // scheda con menu ⋯ aperto

  function toggleCollapse(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ─── PDF import ───────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');

  async function importPdf(file: File) {
    setPdfLoading(true);
    const steps = ['Lettura del PDF…', 'Analisi con AI…', 'Strutturazione scheda…'];
    let si = 0;
    setPdfStatus(steps[0]);
    const timer = setInterval(() => {
      si = Math.min(si + 1, steps.length - 1);
      setPdfStatus(steps[si]);
    }, 2500);
    try {
      const form = new FormData();
      form.append('pdf', file);
      const controller = new AbortController();
      // Oltre i 300 s di maxDuration della route: il browser non deve arrendersi prima del
      // server, altrimenti la scheda viene salvata mentre l'utente vede un errore.
      const timeout = setTimeout(() => controller.abort(), 310000);
      let res: Response;
      try {
        res = await apiFetch('/api/import-pdf', { method: 'POST', body: form, signal: controller.signal });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') throw new Error('Timeout: l\'analisi ha impiegato troppo tempo. Riprova con un PDF più corto.');
        throw new Error('Errore di rete: ' + (fetchErr.message || 'connessione fallita'));
      }
      clearTimeout(timeout);
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Errore server (status ${res.status}). Controlla i log Vercel.`);
      }
      if (!res.ok) {
        if (data.error === 'API_KEY_MISSING') throw new Error('ANTHROPIC_API_KEY mancante. Configurala in .env.local o nelle variabili Vercel.');
        throw new Error(data.error || `Errore server (${res.status})`);
      }
      await loadSchede();
      const nTipi = data.tipi.length;
      const nEs = data.tipi.reduce(
        (s: number, t: any) => s + (t.esercizi?.length ?? 0) + (t.blocchi || []).reduce((bs: number, b: any) => bs + (b.esercizi?.length ?? 0), 0),
        0,
      );
      toast(`Scheda "${data.nome}" importata: ${nTipi} giorni, ${nEs} esercizi`, 'success');
    } catch (err: any) {
      console.error('[import-pdf] Client error:', err);
      toast(err.message || 'Errore sconosciuto durante l\'importazione', 'error');
    } finally {
      clearInterval(timer);
      setPdfLoading(false);
    }
  }

  // ─── Scheda CRUD ──────────────────────────────────────────────
  async function saveScheda(nome: string, mese: string) {
    const m = modal as { type: 'scheda'; schedaId?: string };
    if (m.schedaId) {
      await apiFetch('/api/schede/' + m.schedaId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, mese }) });
    } else {
      await apiFetch('/api/schede', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, mese }) });
    }
    await loadSchede();
    setModal(null);
  }

  async function confirmDuplica(nome: string, mese: string) {
    const m = modal as { type: 'duplica'; schedaId: string };
    await apiFetch(`/api/schede/${m.schedaId}/duplica`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, mese }) });
    await loadSchede();
    setModal(null);
  }

  async function deleteScheda(id: string) {
    await apiFetch('/api/schede/' + id, { method: 'DELETE' });
    await loadSchede();
  }

  // ─── Tipo CRUD ────────────────────────────────────────────────
  async function saveTipo(nome: string) {
    const m = modal as { type: 'tipo'; schedaId: string; tipoId?: string };
    if (m.tipoId) {
      await apiFetch(`/api/schede/${m.schedaId}/tipi/${m.tipoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
    } else {
      await apiFetch(`/api/schede/${m.schedaId}/tipi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
    }
    await loadSchede();
    setModal(null);
  }

  async function deleteTipo(schedaId: string, tipoId: string) {
    await apiFetch(`/api/schede/${schedaId}/tipi/${tipoId}`, { method: 'DELETE' });
    await loadSchede();
  }

  // ─── Esercizio CRUD ───────────────────────────────────────────
  async function saveEsercizio(data: Omit<Esercizio, 'id'>) {
    const m = modal as { type: 'esercizio'; schedaId: string; tipoId: string; esId?: string };
    if (m.esId) {
      await apiFetch(`/api/schede/${m.schedaId}/tipi/${m.tipoId}/esercizi/${m.esId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await apiFetch(`/api/schede/${m.schedaId}/tipi/${m.tipoId}/esercizi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    await loadSchede();
    setModal(null);
  }

  async function deleteEsercizio(schedaId: string, tipoId: string, esId: string) {
    await apiFetch(`/api/schede/${schedaId}/tipi/${tipoId}/esercizi/${esId}`, { method: 'DELETE' });
    await loadSchede();
  }

  // ─── Riordino esercizi (R4: modal con frecce, ex drag&drop) ───
  // Persistenza una-tantum alla conferma: l'ordine viene riordinato in memoria
  // nel ReorderModal e arriva qui come lista di id già ordinata.
  async function saveReorder(schedaId: string, tipoId: string, orderedIds: string[]) {
    await apiFetch(`/api/schede/${schedaId}/tipi/${tipoId}/reorder`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordine: orderedIds }),
    });
    await loadSchede();
    setModal(null);
  }

  // ─── Render ───────────────────────────────────────────────────
  function renderEsercizio(schedaId: string, tipoId: string, e: Esercizio) {
    const tags = [e.ripetizioni, e.carico, e.recupero].filter(Boolean);
    return (
      <div
        key={e.id}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 12px', marginBottom: 4,
          background: 'var(--gt-input-bg)',
          border: '1px solid var(--gt-border)',
          borderRadius: 6,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-barlow)', fontSize: 14, fontWeight: 600,
              color: 'var(--gt-text-primary)',
            }}>
              {e.titolo}
            </span>
            {tags.length > 0 && (
              <span style={{
                fontFamily: 'var(--font-barlow)', fontSize: 12,
                color: 'var(--gt-text-secondary)',
              }}>
                {tags.join(' · ')}
              </span>
            )}
          </div>
          {e.note && (
            <p style={{
              fontFamily: 'var(--font-barlow)', fontSize: 12, fontStyle: 'italic',
              color: 'var(--gt-text-secondary)', marginTop: 2,
            }}>
              {e.note}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <IconBtn onClick={() => setModal({ type: 'storico', esNome: e.titolo })} ariaLabel="Storico pesi">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </IconBtn>
          <IconBtn onClick={() => setModal({ type: 'esercizio', schedaId, tipoId, esId: e.id })} ariaLabel="Modifica">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </IconBtn>
          <IconBtn
            onClick={() => setModal({ type: 'confirm', msg: 'Eliminare questo esercizio?', cb: () => deleteEsercizio(schedaId, tipoId, e.id) })}
            ariaLabel="Elimina"
            danger
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconBtn>
        </div>
      </div>
    );
  }

  function renderTipo(schedaId: string, t: Tipo) {
    return (
      <div key={t.id} style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontFamily: 'var(--font-barlow-condensed)', fontSize: 13, fontWeight: 700,
            letterSpacing: 1.5, color: 'var(--gt-text-primary)', textTransform: 'uppercase',
          }}>
            {t.nome}
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {t.esercizi.length > 1 && (
              <IconBtn onClick={() => setModal({ type: 'reorder', schedaId, tipoId: t.id })} ariaLabel="Riordina esercizi">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L4 7m3-3l3 3M17 8v12m0 0l3-3m-3 3l-3-3" />
                </svg>
              </IconBtn>
            )}
            <IconBtn onClick={() => setModal({ type: 'tipo', schedaId, tipoId: t.id })} ariaLabel="Modifica tipo">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </IconBtn>
            <IconBtn
              onClick={() => setModal({ type: 'confirm', msg: 'Eliminare questo tipo di allenamento?', cb: () => deleteTipo(schedaId, t.id) })}
              ariaLabel="Elimina tipo"
              danger
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconBtn>
          </div>
        </div>
        {t.esercizi.length > 0 && (
          <div>
            {t.esercizi.map(e => renderEsercizio(schedaId, t.id, e))}
          </div>
        )}
        {/* FIX6 §5: una card per blocco circuito (non una per esercizio) */}
        {t.blocchi.map(b => renderBlocco(schedaId, t.id, b))}
        <button
          onClick={() => setModal({ type: 'esercizio', schedaId, tipoId: t.id })}
          style={outlineBtn({ compact: true, fullWidth: false })}
        >
          + Aggiungi esercizio
        </button>
      </div>
    );
  }

  // FIX6 §5: card del blocco circuito. Header = AMRAP <min>' (o Circuito · N giri)
  // + nota comune, mostrati UNA volta. Dentro, la lista dei suoi esercizi.
  function renderBlocco(schedaId: string, tipoId: string, b: Blocco) {
    const isAmrap = b.tipo === 'circuito_amrap';
    const header = isAmrap
      ? `AMRAP ${b.durataMinuti ?? '?'}'`
      : b.tipo === 'circuito_giri'
        ? `Circuito${b.giriTarget ? ` · ${b.giriTarget} giri` : ''}`
        : 'Circuito';
    return (
      <div
        key={b.id}
        style={{
          marginTop: 8, marginBottom: 4,
          border: '1px solid var(--gt-border-strong)',
          borderLeft: `3px solid ${ACCENT}`,
          borderRadius: 8,
          background: 'var(--gt-input-bg)',
          padding: '10px 12px',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-barlow-condensed)', fontSize: 13, fontWeight: 800,
            letterSpacing: 1, color: ACCENT, textTransform: 'uppercase',
          }}>
            {header}
          </span>
          {b.notaComune && (
            <span style={{
              fontFamily: 'var(--font-barlow)', fontSize: 12, fontStyle: 'italic',
              color: 'var(--gt-text-secondary)',
            }}>
              {b.notaComune}
            </span>
          )}
        </div>
        {b.esercizi.map(e => renderEsercizio(schedaId, tipoId, e))}
      </div>
    );
  }

  function renderScheda(s: Scheda, index: number) {
    const isOpen = expanded.has(s.id);
    const nTipi = s.tipi.length;
    const nEs = s.tipi.reduce((sum, t) => sum + tipoEsercizi(t).length, 0);
    const isCurrent = activeScheda?.id === s.id;
    const menuOpen = menuId === s.id;

    return (
      <article
        key={s.id}
        id={`scheda-${s.id}`}
        style={{
          position: 'relative',
          background: 'var(--gt-card)',
          border: `1px solid ${isCurrent ? ACCENT : 'var(--gt-border)'}`,
          borderRadius: 18,
          boxShadow: isCurrent ? '0 0 0 3px rgba(200,241,53,0.18)' : 'none',
          overflow: 'visible',
          marginBottom: 12,
          animation: `gtFadeUp 0.4s ease ${Math.min(0.05 * index, 0.4)}s both`,
        }}
      >
        <div style={{ minWidth: 0, padding: '15px 14px 16px 15px' }}>

          {/* Header row: cover + nome/meta + chevron + ⋯ */}
          <div
            onClick={() => toggleCollapse(s.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            {/* Cover monocroma (lime se attuale) */}
            <div
              aria-hidden
              style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                background: isCurrent ? ACCENT : 'var(--gt-hero-bg)',
                color: isCurrent ? '#0C0C0C' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-barlow-condensed)', fontSize: 21, fontWeight: 800,
              }}
            >
              {schedaInitials(s.nome)}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-barlow)', fontSize: 19, fontWeight: 700, color: 'var(--gt-text-primary)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.nome}
              </div>
              <div style={{ marginTop: 3, fontFamily: 'var(--font-barlow)', fontSize: 13.5, fontWeight: 500, color: 'var(--gt-text-secondary)' }}>
                {s.mese ? `${s.mese} · ` : ''}{nTipi} {nTipi === 1 ? 'tipo' : 'tipi'} · {nEs} {nEs === 1 ? 'esercizio' : 'esercizi'}
              </div>
            </div>

            {/* Chevron */}
            <svg
              width="18" height="18" fill="none" stroke="var(--gt-text-muted)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>

            {/* ⋯ menu */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setMenuId(menuOpen ? null : s.id); }}
              aria-label="Azioni scheda" aria-haspopup="menu" aria-expanded={menuOpen}
              style={{ flexShrink: 0, width: 44, height: 44, marginRight: -6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gt-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
              </svg>
            </button>
          </div>

          {/* Footer: badge Attuale / Imposta attuale (allineato al testo) */}
          <div style={{ paddingLeft: 58, marginTop: 10 }}>
            {isCurrent ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: ACCENT, color: '#0C0C0C', borderRadius: 999, fontFamily: 'var(--font-barlow-condensed)', fontSize: 12.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
                Attuale
              </span>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setActiveSchedaId(s.id); }}
                style={{ padding: '7px 14px', background: 'transparent', color: 'var(--gt-text-secondary)', border: '1px solid var(--gt-border)', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' }}
              >
                Imposta attuale
              </button>
            )}
          </div>

          {/* Popover azioni */}
          {menuOpen && (
            <>
              <div onClick={e => { e.stopPropagation(); setMenuId(null); }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div role="menu" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 52, right: 12, zIndex: 41, minWidth: 150, background: 'var(--gt-card)', border: '1px solid var(--gt-border)', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
                <SchedaMenuItem label="Duplica" onClick={() => { setMenuId(null); setModal({ type: 'duplica', schedaId: s.id }); }} />
                <div style={{ height: 1, background: 'var(--gt-border)' }} />
                <SchedaMenuItem label="Modifica" onClick={() => { setMenuId(null); setModal({ type: 'scheda', schedaId: s.id }); }} />
                <div style={{ height: 1, background: 'var(--gt-border)' }} />
                <SchedaMenuItem label="Elimina" danger onClick={() => { setMenuId(null); setModal({ type: 'confirm', msg: 'Eliminare questa scheda e tutti i suoi dati?', cb: () => deleteScheda(s.id) }); }} />
              </div>
            </>
          )}

          {/* Expanded content */}
          {isOpen && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--gt-border)' }}>
              {s.tipi.map(t => renderTipo(s.id, t))}
              <button
                onClick={() => setModal({ type: 'tipo', schedaId: s.id })}
                style={outlineBtn({ fullWidth: true })}
              >
                + Aggiungi tipo di allenamento
              </button>
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="gt-shell">
      <div className="gt-canvas">

        {/* Actions row */}
        <section style={{ padding: '28px 28px 0', animation: 'gtFadeUp 0.5s ease 0.1s both' }}>
          <Link
            href="/schede"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              padding: '6px 0',
              fontFamily: 'var(--font-barlow-condensed)',
              fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'var(--gt-text-secondary)',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Scheda attuale
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 38, fontWeight: 800, lineHeight: 0.9, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--gt-text-primary)', margin: 0 }}>
                Archivio<br />schede
              </h1>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-barlow)', fontSize: 12.5, color: 'var(--gt-text-muted)' }}>
                {schede.length} {schede.length === 1 ? 'scheda' : 'schede'}{activeScheda ? ' · 1 attuale' : ''}
              </div>
            </div>
            <button
              onClick={() => setModal({ type: 'scheda' })}
              style={{ flexShrink: 0, height: 44, padding: '0 16px', background: 'var(--gt-hero-bg)', color: '#fff', border: 'none', borderRadius: 13, cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}
            >
              + Nuova
            </button>
          </div>

          {/* PDF drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDropOver(true); }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
            }}
            onDrop={async e => {
              e.preventDefault();
              setDropOver(false);
              const file = e.dataTransfer.files[0];
              if (!file) return;
              if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                toast('Carica un file PDF', 'error');
                return;
              }
              await importPdf(file);
            }}
            onClick={() => !pdfLoading && document.getElementById('pdf-input')?.click()}
            style={{
              padding: '24px 20px',
              borderRadius: 8,
              border: `1.5px dashed ${dropOver || pdfLoading ? ACCENT : 'var(--gt-input-border)'}`,
              background: dropOver ? `${ACCENT}14` : 'var(--gt-input-bg)',
              textAlign: 'center',
              cursor: pdfLoading ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="file" id="pdf-input" accept=".pdf" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { e.target.value = ''; importPdf(f); }
              }}
            />
            {pdfLoading ? (
              <div>
                <div style={{
                  fontFamily: 'var(--font-barlow-condensed)', fontSize: 11, fontWeight: 700,
                  letterSpacing: 2, color: 'var(--gt-text-primary)', textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                  {pdfStatus}
                </div>
                <div style={{
                  fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'var(--gt-text-secondary)',
                }}>
                  L&apos;AI sta analizzando la scheda
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  fontFamily: 'var(--font-barlow-condensed)', fontSize: 13, fontWeight: 700,
                  letterSpacing: 1.5, color: 'var(--gt-text-primary)', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Importa da PDF
                </div>
                <div style={{
                  fontFamily: 'var(--font-barlow)', fontSize: 13, color: 'var(--gt-text-secondary)',
                }}>
                  Trascina qui il file o clicca per selezionarlo
                </div>
              </div>
            )}
          </div>
        </section>

        <hr className="gt-divider" style={{ margin: '24px 28px 0' }} />

        {/* Schede list */}
        <section style={{ padding: '24px 28px 40px', animation: 'gtFadeUp 0.5s ease 0.2s both' }}>
          {schede.length === 0 ? (
            <p className="gt-empty">Nessuna scheda in archivio. Creane una con &quot;+ Nuova&quot; o importa un PDF qui sopra.</p>
          ) : (
            <div>
              {schede.map((s, i) => renderScheda(s, i))}
            </div>
          )}
        </section>
      </div>

      {/* Modali (stile Nike legacy — migrazione modali task separato) */}
      {modal?.type === 'scheda' && (
        <SchedaModal
          title={modal.schedaId ? 'Modifica scheda' : 'Nuova scheda'}
          initialNome={modal.schedaId ? (schede.find(s => s.id === modal.schedaId)?.nome ?? '') : ''}
          initialMese={modal.schedaId ? (schede.find(s => s.id === modal.schedaId)?.mese ?? '') : ''}
          onSave={saveScheda}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'duplica' && (
        <SchedaModal
          title="Duplica scheda"
          initialNome={(schede.find(s => s.id === modal.schedaId)?.nome ?? '') + ' (copia)'}
          initialMese=""
          onSave={confirmDuplica}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'tipo' && (
        <TipoModal
          title={modal.tipoId ? 'Modifica tipo' : 'Nuovo tipo'}
          initialNome={modal.tipoId ? (schede.find(s => s.id === modal.schedaId)?.tipi.find(t => t.id === modal.tipoId)?.nome ?? '') : ''}
          onSave={saveTipo}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'esercizio' && (() => {
        const scheda = schede.find(s => s.id === modal.schedaId);
        const tipo = scheda?.tipi.find(t => t.id === modal.tipoId);
        const es = modal.esId ? tipo?.esercizi.find(e => e.id === modal.esId) : undefined;
        return (
          <EsercizioModal
            title={modal.esId ? 'Modifica esercizio' : 'Nuovo esercizio'}
            initial={es ?? {}}
            onSave={saveEsercizio}
            onClose={() => setModal(null)}
          />
        );
      })()}
      {modal?.type === 'reorder' && (() => {
        const tipo = schede.find(s => s.id === modal.schedaId)?.tipi.find(t => t.id === modal.tipoId);
        if (!tipo) return null;
        return (
          <ReorderModal
            title={tipo.nome}
            items={tipo.esercizi.map(ex => ({ id: ex.id, label: ex.titolo }))}
            onSave={ids => saveReorder(modal.schedaId, modal.tipoId, ids)}
            onClose={() => setModal(null)}
          />
        );
      })()}
      {modal?.type === 'storico' && (
        <StoricoPesiModal esNome={modal.esNome} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmModal msg={modal.msg} onConfirm={modal.cb} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, ariaLabel, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: danger ? 'var(--gt-neg)' : 'var(--gt-text-secondary)',
        padding: 6, borderRadius: 4, display: 'flex',
      }}
    >
      {children}
    </button>
  );
}

function SchedaMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-barlow)', fontSize: 15, fontWeight: 600,
        color: danger ? 'var(--gt-neg)' : 'var(--gt-text-primary)',
      }}
    >
      {label}
    </button>
  );
}

function outlineBtn({ fullWidth, compact }: { fullWidth?: boolean; compact?: boolean }): React.CSSProperties {
  return {
    width: fullWidth ? '100%' : 'auto',
    marginTop: compact ? 8 : 16,
    padding: compact ? '8px 16px' : '11px 20px',
    background: 'transparent',
    border: '1px dashed var(--gt-input-border)',
    borderRadius: 6,
    fontFamily: 'var(--font-barlow-condensed)',
    fontSize: compact ? 11 : 12, fontWeight: 700,
    letterSpacing: 1.5, textTransform: 'uppercase',
    color: 'var(--gt-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
}
