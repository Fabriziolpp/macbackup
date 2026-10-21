'use client';

import { useState } from 'react';
import { Esercizio } from '@/providers/AppProvider';

interface Props { title: string; initial: Partial<Esercizio>; onSave: (d: Omit<Esercizio,'id'>) => void; onClose: () => void; }

export default function EsercizioModal({ title, initial, onSave, onClose }: Props) {
  const [titolo,      setTitolo]      = useState(initial.titolo      ?? '');
  const [ripetizioni, setRipetizioni] = useState(initial.ripetizioni ?? '');
  const [carico,      setCarico]      = useState(initial.carico      ?? '');
  const [recupero,    setRecupero]    = useState(initial.recupero    ?? '');
  const [note,        setNote]        = useState(initial.note        ?? '');

  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-sheet">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">
          <p className="nk-kicker" style={{ marginBottom: 8 }}>Esercizio</p>
          <h2 style={{
            fontFamily: 'var(--font-anton), Impact, sans-serif',
            fontSize: 32, textTransform: 'uppercase', lineHeight: 0.95,
            marginBottom: 24, color: 'var(--nk-black)', fontWeight: 400,
          }}>{title}</h2>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="nk-form-label">Esercizio</label>
              <input value={titolo} onChange={e => setTitolo(e.target.value)} className="nk-input" placeholder="es. Squat" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div>
                <label className="nk-form-label">Serie×Rip</label>
                <input value={ripetizioni} onChange={e => setRipetizioni(e.target.value)} className="nk-input" placeholder="4×8" />
              </div>
              <div>
                <label className="nk-form-label">Carico</label>
                <input value={carico} onChange={e => setCarico(e.target.value)} className="nk-input" placeholder="80kg" />
              </div>
              <div>
                <label className="nk-form-label">Recupero</label>
                <input value={recupero} onChange={e => setRecupero(e.target.value)} className="nk-input" placeholder="90s" />
              </div>
            </div>
            <div>
              <label className="nk-form-label">Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="nk-textarea" placeholder="Facoltativo…" />
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:28 }}>
            <button onClick={onClose} className="nk-btn-outline" style={{ flex:1 }}>Annulla</button>
            <button
              onClick={() => { if (titolo.trim()) onSave({ titolo:titolo.trim(), ripetizioni, carico, recupero, note }); }}
              className="nk-btn-primary"
              style={{ flex:1 }}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
