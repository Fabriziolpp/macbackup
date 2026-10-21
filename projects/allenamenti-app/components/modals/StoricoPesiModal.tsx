'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/providers/AppProvider';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
function formatDateIT(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${MESI[m-1].toLowerCase()} ${y}`;
}
function parseCarico(s: string) {
  const m = String(s||'').match(/(\d+(?:[.,]\d+)?)\s*kg/i)
         || String(s||'').match(/x\s*(\d+(?:[.,]\d+)?)/i)
         || String(s||'').match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',','.')) : null;
}

export default function StoricoPesiModal({ esNome, onClose }: { esNome: string; onClose: () => void }) {
  const { weightLogs, loadWeightLogs, apiFetch } = useApp();
  const [date,   setDate]   = useState(toDateStr(new Date()));
  const [carico, setCarico] = useState('');
  const [note,   setNote]   = useState('');
  const chartRef  = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<Chart | null>(null);

  const logs = weightLogs.filter(l => l.esNome === esNome).sort((a,b) => a.date.localeCompare(b.date));
  const hasChart = logs.filter(l => parseCarico(l.carico) !== null).length >= 2;

  useEffect(() => {
    if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
    if (!chartRef.current || !hasChart) return;
    const points = logs
      .map(l => ({ x: formatDateIT(l.date), y: parseCarico(l.carico) }))
      .filter(p => p.y !== null) as {x:string;y:number}[];
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: points.map(p => p.x),
        datasets: [{
          label: 'Carico',
          data: points.map(p => p.y),
          borderColor: '#111111',
          backgroundColor: 'rgba(17,17,17,0.08)',
          pointBackgroundColor: '#111111',
          pointBorderColor: '#111111',
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#707072', font: { size: 9 } }, grid: { display: false } },
          y: { beginAtZero: false, ticks: { color: '#707072', font: { size: 9 } }, grid: { color: '#E5E5E5' } }
        }
      }
    });
    return () => { chartInst.current?.destroy(); chartInst.current = null; };
  }, [logs.length]);

  async function addLog() {
    if (!carico) return;
    await apiFetch('/api/weight-logs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date, esNome, carico, note }) });
    await loadWeightLogs();
    setCarico(''); setNote('');
  }

  async function deleteLog(id: string) {
    await apiFetch('/api/weight-logs/'+id, { method:'DELETE' });
    await loadWeightLogs();
  }

  return (
    <>
      <div onClick={onClose} className="nk-modal-scrim" />
      <div className="nk-modal-sheet">
        <div onClick={e => e.stopPropagation()} className="nk-modal-body">

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:20 }}>
            <div style={{ minWidth: 0 }}>
              <p className="nk-kicker" style={{ marginBottom: 6 }}>Storico pesi</p>
              <h2 style={{
                fontFamily: 'var(--font-anton), Impact, sans-serif',
                fontSize: 28, textTransform: 'uppercase', lineHeight: 0.95,
                color: 'var(--nk-black)', fontWeight: 400,
                wordBreak: 'break-word',
              }}>{esNome}</h2>
            </div>
            <button onClick={onClose} className="nk-icon-btn" aria-label="Chiudi">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Chart */}
          <div style={{
            position:'relative', height:160, marginBottom:24,
            background:'var(--nk-snow)', padding:'12px 12px 8px',
            display: hasChart ? 'block' : 'flex',
            alignItems:'center', justifyContent:'center',
          }}>
            {hasChart
              ? <canvas ref={chartRef} />
              : <p className="nk-body-muted">Aggiungi almeno 2 rilevazioni per vedere il grafico</p>
            }
          </div>

          {/* Add form */}
          <div style={{ marginBottom:24 }}>
            <p className="nk-label" style={{ marginBottom:12 }}>Aggiungi rilevazione</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label className="nk-form-label">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="nk-input" />
              </div>
              <div>
                <label className="nk-form-label">Carico</label>
                <input value={carico} onChange={e => setCarico(e.target.value)} className="nk-input" placeholder="80kg" />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="nk-form-label">Note</label>
              <input value={note} onChange={e => setNote(e.target.value)} className="nk-input" placeholder="Facoltativo…" />
            </div>
            <button onClick={addLog} className="nk-btn-primary" style={{ width:'100%' }}>Aggiungi</button>
          </div>

          {/* Log list */}
          <div>
            <p className="nk-label" style={{ marginBottom:8 }}>Storico</p>
            {logs.length === 0
              ? <p className="nk-body-muted" style={{ textAlign:'center', padding:'12px 0' }}>Nessuna rilevazione ancora</p>
              : [...logs].reverse().map(l => (
                <div key={l.id} className="nk-row">
                  <div className="nk-row-main">
                    <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                      <span className="nk-label-dark">{l.carico}</span>
                      <span className="nk-label">{formatDateIT(l.date)}</span>
                    </div>
                    {l.note && (
                      <p className="nk-body-muted" style={{ fontStyle:'italic' }}>{l.note}</p>
                    )}
                  </div>
                  <div className="nk-row-actions">
                    <button onClick={() => deleteLog(l.id)} className="nk-icon-btn" aria-label="Elimina">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </>
  );
}
