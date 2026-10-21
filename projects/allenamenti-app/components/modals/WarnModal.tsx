'use client';

interface Props { msg: string; onConfirm: () => void; onClose: () => void; }

export default function WarnModal({ msg, onConfirm, onClose }: Props) {
  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-center">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">
          <p className="nk-kicker" style={{ color:'var(--nk-red)', marginBottom:12 }}>Attenzione</p>
          <p className="nk-body" style={{ marginBottom:28 }}>{msg}</p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} className="nk-btn-outline" style={{ flex:1 }}>
              Annulla
            </button>
            <button
              onClick={() => { onClose(); onConfirm(); }}
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
