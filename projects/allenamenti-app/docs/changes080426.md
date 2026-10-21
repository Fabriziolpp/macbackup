# Changes 08/04/2026

## Stack Tecnologico

| Layer | Tecnologia | Versione | Note |
|-------|-----------|---------|------|
| Framework | Next.js (App Router) | 16.2 | Turbopack in dev |
| Linguaggio | TypeScript | 6.x | Strict mode |
| UI | React | 19 | Client Components |
| Styling | Tailwind CSS + CSS custom | 4.x | Design system Spotify-inspired |
| Font | DM Sans | Google Fonts | 400/600/700 + italic |
| Animazioni | Framer Motion | latest | Installato, non ancora applicato |
| Charts | Chart.js + react-chartjs-2 | 4.x | Grafici a barre e linea |
| Database | Supabase (PostgreSQL + RLS) | hosted | Row-Level Security via JWT |
| Auth | Supabase Auth | JWT | Login/Registrazione email |
| AI | Anthropic Claude API | SDK 0.78 | Import schede da PDF |
| PDF parsing | pdf-parse | 1.1.1 | Dynamic import (fix Vercel) |
| Mobile (iOS) | Capacitor | latest | WebView su URL Vercel |
| Deploy | Vercel | — | Auto-deploy da main |
| Repo | GitHub | `Fabriziolpp/allenamenti-app` | — |

---

## Redesign completo UI — Design System Spotify-inspired

Redesign integrale di tutta l'interfaccia utente utilizzando un design system dark ispirato a Spotify, definito in `docs/DESIGN.md` e applicato tramite variabili CSS custom + classi utility in `globals.css`.

### Design Tokens (`globals.css`)

| Token | Valore | Uso |
|-------|--------|-----|
| `--bg` | `#121212` | Background pagina |
| `--surface` | `#181818` | Card, nav, modali |
| `--mid` | `#1f1f1f` | Input, pulsanti secondari, righe |
| `--card` | `#252525` | Card elevate |
| `--green` | `#1ed760` | Accent primario (CTA, valori attivi) |
| `--green-dark` | `#1db954` | Green hover/pressed |
| `--white` | `#ffffff` | Testo primario |
| `--silver` | `#b3b3b3` | Testo secondario |
| `--muted` | `#7c7c7c` | Testo terziario, label |
| `--neg` | `#f3727f` | Errori, eliminazione |
| `--warn` | `#ffa42b` | Warning (streak non attiva) |
| `--info` | `#539df5` | Info toast |
| `--border` | `rgba(255,255,255,0.08)` | Bordi sottili |
| `--border-dim` | `rgba(255,255,255,0.10)` | Bordi leggeri (schede, tipo) |
| `--border-mid` | `#4d4d4d` | Bordi medi (scrollbar) |
| `--shadow-heavy` | `0px 8px 24px rgba(0,0,0,0.5)` | Modali, elementi elevati |
| `--inset-border` | `inset box-shadow` | Input focus style |
| `--radius-pill` | `9999px` | Bottoni pill, toast |
| `--radius-card` | `8px` | Card |

### Classi utility aggiunte

| Classe | Descrizione |
|--------|-------------|
| `.sp-input` | Input dark con bordo inset, focus ring verde |
| `.sp-select` | Select dark con stessa estetica degli input |
| `.sp-textarea` | Textarea dark |
| `.btn-green` | CTA verde, uppercase, tracking largo, pill shape |
| `.btn-dark` | Bottone secondario dark |
| `.btn-outline` | Bottone bordo con hover verde |
| `.btn-ghost` | Bottone trasparente per icone |
| `.btn-circle` | Cerchio verde 36px per frecce navigazione |
| `.card` | Card `var(--surface)` con padding 16px, ombra, bordo sottile |
| `.card-static` | Card senza hover (stat cards) |
| `.tag` | Pill label (`var(--mid)` bg, testo silver) |
| `.tag-green` | Pill label accent verde |
| `.form-label` | Label uppercase, tracking, muted |
| `.text-label` | Titolo sezione uppercase |

### Animazioni

- Aggiunto `@keyframes spin` per loader spinner (import PDF)
- Ordine import CSS corretto: Google Fonts `@import url()` **prima** di `@import "tailwindcss"` (fix errore PostCSS)

---

## File modificati

### `app/globals.css`
- Riscritto da zero con il design system Spotify
- Aggiunta DM Sans da Google Fonts
- Tutte le variabili CSS, classi utility, scrollbar dark, keyframes
- Fix ordine `@import`: Google Fonts prima di Tailwind (evita errore PostCSS "import must precede all rules")

### `components/Nav.tsx`
- Background `#181818`, testo silver
- Logo: cerchio verde con icona dumbbell
- Tab attiva: testo bianco + underline verde 2px
- Rimosso toggle dark mode (l'app e' sempre dark)
- Logout button ghost

### `app/(auth)/login/page.tsx`
- Layout dark immersivo full-height
- Logo grande con glow verde
- Tab switcher pill (bianco attivo / trasparente inattivo)
- Input `.sp-input`, bottone `.btn-green`
- Transizioni fluide tra Login e Registrati

### `components/WorkoutCard.tsx`
- Background `var(--surface)`, bordo sottile
- `.tag` per nome scheda, `.tag-green` per durata in minuti
- Icone edit/delete ghost con hover colorato
- Data e ora in `var(--muted)`

### `components/Toast.tsx`
- Pill shape (border-radius 9999px)
- Colori: verde per success, rosso per error, blu per info
- Shadow heavy, fixed bottom center

### Modali (6 file)
Tutti i modali (`ConfirmModal`, `WarnModal`, `SchedaModal`, `TipoModal`, `EsercizioModal`, `StoricoPesiModal`) riscritti con:
- Bottom-sheet style: `border-radius: 16px 16px 0 0`
- Backdrop blur `rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)`
- Drag indicator bar (36x4px grigia centrata)
- Input `.sp-input`, bottoni `.btn-green` / `.btn-outline`
- Chart storico pesi con linea verde su sfondo `var(--mid)`

### `app/(app)/home/page.tsx`
- Streak banner con bordo sinistro verde (attivo) o arancio (ieri)
- Emoji dinamiche per streak (>=14 fuoco, >=7 lampo, default medaglia)
- Form registra allenamento con tutti gli input dark
- Lista recenti con `WorkoutCard`, paginazione "Carica altri"

### `app/(app)/settimana/page.tsx`
- Header con frecce `.btn-circle` verdi e titolo settimana ISO
- Stat card: numero allenamenti bianco, minuti verde
- Lista `WorkoutCard`

### `app/(app)/mese/page.tsx`
- Stessa struttura di navigazione con `.btn-circle`
- Chart a barre **verde** (sostituito il blu) su griglia scura
- Toggle pill Min/Sessioni: attivo verde, inattivo `var(--mid)`
- Stat card + lista allenamenti

### `app/(app)/anno/page.tsx`
- Chart mensile a barre verdi
- Toggle pill Min/Sessioni
- Riepilogo mensile: card dark con nome mese + contatore + minuti in verde
- Lista completa allenamenti

### `app/(app)/schede/page.tsx`
- Header con titolo "Schede" + bottone "+ Nuova scheda" verde
- PDF drop zone dark: bordo dashed, icona PDF rossa, testo "clicca per selezionarlo" in verde
- Spinner verde durante import AI
- Card scheda: titolo bianco, mese muted, bottoni ghost (duplica/modifica/elimina)
- Tipo: `.tag` pill, bordo `var(--border-dim)`, esercizi su `var(--mid)`
- Esercizio: drag handle, titolo + tags (ripetizioni/carico/recupero), icone ghost (storico/modifica/elimina)
- Bottone "+ Aggiungi tipo" con bordo dashed che diventa verde al hover

### `package.json`
- Aggiunto `framer-motion` come dipendenza

---

## Riepilogo quantitativo

| Metrica | Valore |
|---------|--------|
| File modificati | 20 |
| Righe aggiunte | ~986 |
| Righe rimosse | ~608 |
| Pagine ridisegnate | 6 (login, home, settimana, mese, anno, schede) |
| Componenti ridisegnati | 9 (Nav, Toast, WorkoutCard, 6 modali) |
| Nuove classi CSS utility | 14 |
| Variabili CSS design tokens | 18 |
