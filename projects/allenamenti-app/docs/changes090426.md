# Changes 09/04/2026

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
| Deploy | Vercel | — | Auto-deploy da main, `vercel.json` con framework nextjs |
| Repo | GitHub | `Fabriziolpp/allenamenti-app` | — |

---

## Modifiche del giorno

### 1. Fix layout centrato e max-width unificato

**Commit:** `2b16d8a`

**Problema:** Il contenuto delle pagine era schiacciato a sinistra mentre la Nav restava centrata. La pagina era bloccata in breakpoint mobile senza layout desktop.

**Cause:**
- `body` in `app/layout.tsx` usava classi Tailwind chiare (`bg-gray-50`, `text-gray-800`) che sovrascrivevano il dark theme
- Max-width disallineati: Nav a 680px, `<main>` a 672px (Tailwind `max-w-2xl`), pagine a 640px inline
- Nessun breakpoint responsive

**Fix:**
| File | Modifica |
|------|----------|
| `app/layout.tsx` | Rimosso `className="bg-gray-50 text-gray-800"`, sostituito con `style` che usa `var(--bg)`, `var(--white)`, `var(--font)` dal design system |
| `app/(app)/AppLayoutClient.tsx` | `<main>` da `className="max-w-2xl mx-auto px-4 py-6"` a `style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}` |
| `components/Nav.tsx` | Max-width da 680px a 720px per allinearsi al `<main>` |
| 5 pagine (`home`, `settimana`, `mese`, `anno`, `schede`) | Rimosso `maxWidth: 640` inline — il contenimento e' ora gestito dal wrapper `<main>` a 720px |

---

### 2. Rimozione `public/index.html` (vecchia UI vanilla)

**Commit:** `3033a82`

**Problema:** Dopo il deploy su Vercel, il sito mostrava ancora la vecchia UI nonostante il redesign fosse stato pushato.

**Causa:** Il file `public/index.html` (1645 righe, 85KB) — la vecchia app HTML/JS vanilla — veniva servito da Next.js come file statico alla root `/`, bypassando completamente le route React del nuovo frontend.

**Fix:** Rimosso `public/index.html` dal repository (backup locale conservato come `.bak`).

---

### 3. Aggiunta `vercel.json` con framework preset

**Commit:** `ea063d2`

**Problema:** Dopo la rimozione di `index.html`, Vercel restituiva "Cannot GET /" — il progetto non veniva riconosciuto come Next.js.

**Fix:** Creato `vercel.json`:
```json
{
  "framework": "nextjs"
}
```

Questo forza Vercel a usare il build system Next.js, garantendo che le route dell'App Router vengano servite correttamente.

---

## Riepilogo

| Metrica | Valore |
|---------|--------|
| Commit del giorno | 3 |
| File modificati | 10 |
| File rimossi | 1 (`public/index.html`) |
| File creati | 1 (`vercel.json`) |
| Bug fix deploy | 2 (index.html statico, framework detection) |
| Bug fix layout | 1 (allineamento centrato + dark theme body) |
