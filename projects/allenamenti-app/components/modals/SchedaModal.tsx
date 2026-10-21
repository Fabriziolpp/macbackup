'use client';

import { useState } from 'react';

interface Props { title: string; initialNome: string; initialMese: string; onSave: (n: string, m: string) => void; onClose: () => void; }

export default function SchedaModal({ title, initialNome, initialMese, onSave, onClose }: Props) {
  const [nome, setNome] = useState(initialNome);
  const [mese, setMese] = useState(initialMese);
  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-sheet">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">
          <p className="nk-kicker" style={{ marginBottom: 8 }}>Scheda</p>
          <h2 style={{
            fontFamily: 'var(--font-anton), Impact, sans-serif',
            fontSize: 32, textTransform: 'uppercase', lineHeight: 0.95,
            marginBottom: 24, color: 'var(--nk-black)', fontWeight: 400,
          }}>{title}</h2>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="nk-form-label">Nome scheda</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className="nk-input" placeholder="es. Scheda Marzo 2026" />
            </div>
            <div>
              <label className="nk-form-label">Periodo (facoltativo)</label>
              <input value={mese} onChange={e => setMese(e.target.value)} className="nk-input" placeholder="es. Marzo 2026" />
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:28 }}>
            <button onClick={onClose} className="nk-btn-outline" style={{ flex:1 }}>Annulla</button>
            <button
              onClick={() => { if (nome.trim()) onSave(nome.trim(), mese.trim()); }}
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
