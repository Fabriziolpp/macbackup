# `home-codebase/` — snapshot della home per Claude Design

Cartella da trascinare nel riquadro **"Attach codebase"** di Claude Design (claude.ai/design) per iterare sul design della home page di GymTonic.

## File

| File | Cosa contiene |
|---|---|
| `page.tsx` | Componente React della home (`app/(app)/home/page.tsx` verbatim). |
| `styles.css` | Tutte le classi `.gt-*` usate dalla home + token `--gt-*` + media queries mobile. |
| `fonts.html` | Snippet `<link>` per caricare **Barlow** + **Barlow Condensed** da Google Fonts (nell'app reale sono caricati via `next/font`). |

## Note per Claude Design

- **Layout**: `.gt-shell` (wrapper grigio con padding) > `.gt-canvas` (card bianca centrata, max-width **820px**, border-radius 8). Su mobile (`<640px`) il canvas diventa edge-to-edge.
- **Colori chiave**:
  - `--gt-bg: #F4F2EE` (sfondo canvas)
  - `--gt-hero-bg: #0D0D0D` (hero sempre scuro)
  - `--gt-accent: #C8F135` (lime — active state + evidenziazioni)
- **Tipografia**:
  - `Barlow` (variable `--font-barlow`) per body, meta, card.
  - `Barlow Condensed` (variable `--font-barlow-condensed`) per headings, label uppercase, numeri grandi nell'hero, tag.
- **Dati**: il componente usa `useApp()` hook (Supabase-backed) + helper (`weeklyStats`, `dateUtils`, `schedaColor`) + 2 modali (`ConfirmModal`, `WarnModal`) che non sono in questa cartella. Per un prototipo isolato sostituire `workouts` / `schede` con mock locali — es.:

```ts
const workouts = [
  { id: '1', data: '2026-04-22', ora: '09:15', scheda: 'A', tipo: 'Petto', durata: 58, note: '' },
  { id: '2', data: '2026-04-20', ora: '18:30', scheda: 'B', tipo: 'Schiena', durata: 62, note: 'Ottimo' },
];
const schede = [
  { id: 's1', nome: 'A', tipi: [{ id: 't1', nome: 'Petto' }, { id: 't2', nome: 'Spalle' }] },
  { id: 's2', nome: 'B', tipi: [{ id: 't3', nome: 'Schiena' }] },
];
```

E tipi colore scheda:
```ts
function schedaColor(nome: string) {
  const map: Record<string, { bg: string; text: string }> = {
    A: { bg: '#E8F5E9', text: '#2E7D32' },
    B: { bg: '#E3F2FD', text: '#1565C0' },
    C: { bg: '#FFF3E0', text: '#EF6C00' },
  };
  return map[nome] ?? { bg: '#EEE', text: '#555' };
}
```

## Struttura visuale (dall'alto)

1. **Nav** sticky (52px) — logo lime + 5 tab (Home attivo) + bottone logout.
2. **Hero scuro** — label settimana, badge livello, numero grande (`3/5 allenamenti`), progress segmentato (5 tacche), frase motivazionale.
3. **Streak** — due card affiancate (corrente + record), quella record in accent lime.
4. **Motivational** — quote italic con bordo sinistro accent.
5. **Registra** — form espandibile (data/ora, pill scheda, pill tipo, durata+note, save).
6. **Recenti** — lista di `.gt-card` (stripe color + tag scheda + tipo + durata + data + azioni edit/delete).
