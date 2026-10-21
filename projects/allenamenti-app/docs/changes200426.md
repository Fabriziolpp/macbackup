# Changes 20/04/2026

## Stack Tecnologico

| Layer | Tecnologia | Versione | Note |
|-------|-----------|---------|------|
| Framework | Next.js (App Router) | 16.2.2 | Turbopack in dev |
| Linguaggio | TypeScript | 6.x | Strict mode |
| UI | React | 19.2.4 | Client Components |
| Styling | Tailwind CSS v4 + CSS custom | 4.x | **Design system GymTonic** (home) + Nike legacy (altre pagine) |
| Font | Barlow + Barlow Condensed (GymTonic), Anton + Archivo (Nike legacy) | Google Fonts | Tutti via `next/font/google` |
| Animazioni | Framer Motion + keyframes CSS | — | `gtFillBar`, `gtFadeUp` su home |
| Charts | Chart.js + react-chartjs-2 | 4.x | Usato su mese/anno |
| Database | Supabase (PostgreSQL + RLS) | hosted | JWT row-level security |
| Auth | Supabase Auth | JWT | — |
| AI | Anthropic Claude API | SDK 0.78 | Import schede da PDF via base64 |
| Mobile (iOS) | Capacitor | 8.3.0 | WebView su URL Vercel |
| Deploy | Vercel | — | Auto-deploy da main |

---

## Modifiche del giorno

### 1. Redesign home page → GymTonic design system

**Problema:** La home seguiva il design Nike (monocromatico black/white, Anton/Archivo) ma il progetto doveva adottare un'estetica sportiva-editoriale con hero dark, accent lime, tipografia Barlow. Design handoff fornito via zip (`/tmp/gymtonic-design/`).

**Decisioni chiave:**
- GymTonic adottato **solo sulla home** come pilota. Le altre pagine restano Nike finché non saranno migrate singolarmente.
- Classi prefissate `.gt-*` per convivere con `.nk-*` senza conflitti.
- Hero sempre `#0D0D0D` indipendentemente dal resto del layout.
- Accent lime `#C8F135` come token configurabile.
- Canvas 820px centrato su desktop, edge-to-edge su mobile <640px.

**File toccati:**
| File | Modifica |
|------|----------|
| `app/globals.css` | Aggiunta sezione GymTonic (righe ~322-675): token `--gt-*`, keyframes `gtFillBar`/`gtFadeUp`, 50 classi `.gt-*` (shell, canvas, nav, hero, streak, motiv, registra form, card, load-more, empty). |
| `app/layout.tsx` | Aggiunti font `Barlow` (400/500/600 + italic) e `Barlow_Condensed` (400-900). Anton/Archivo mantenuti per Nike legacy. |
| `app/(app)/AppLayoutClient.tsx` | Nav globale nascosta su `/home` (`pathname === '/home'`) perché GymTonic ha nav interna al canvas. Main background trasparente solo su home. |
| `app/(app)/home/page.tsx` | Riscrittura completa: `.gt-shell` > `.gt-canvas` > nav interna + hero animato (num 120px, progress bars staggered 80ms) + streak duo + motiv quote + registra form collapsible + recenti list con hover-reveal actions. |

---

### 2. Cleanup design system Spotify (dead code)

**Problema:** `app/globals.css` conteneva ancora 279 righe di token e classi Spotify (`--bg`, `--green`, `.card`, `.sp-input`, `.btn-green`, `.tag`, `.dnd-row`, `.form-label`, keyframe `flicker`, import DM Sans) dopo 2 redesign successivi. Nessun componente le usava più.

**Verifica:** `grep` su `**/*.tsx` per ciascun token/classe Spotify → 0 matches.

**Fix:** Rimosse righe 1-279 di `globals.css`. Mantenuti `.nk-*` (Nike, usati da 5 pagine) e aggiunti `.gt-*` (GymTonic).

---

### 3. Fix rendering cache Turbopack

**Problema:** Dopo aver aggiunto le classi `.gt-*` e riscritto la home, la pagina appariva completamente unstyled in browser. Screenshot utente mostrava fallback HTML bianco.

**Diagnosi:** `curl` sul chunk CSS servito da `/_next/static/css/...` → 90 classi `.nk-*` presenti, **0 classi `.gt-*`**. Turbopack stava servendo una cache stale.

**Fix:**
```bash
# stop dev server
rm -rf .next/cache
npm run dev
```

Dopo restart: 89 `.gt-*` + 90 `.nk-*` nel CSS servito. Hard-refresh del browser completato il fix.

---

### 4. Filosofia flat: rimozione shadow

**Problema:** Il design handoff iniziale includeva `box-shadow: 0 24px 80px rgba(0,0,0,0.25)` sul canvas e `0 4px 20px rgba(0,0,0,0.1)` sull'hover delle workout card. L'utente ha chiesto invece un approccio completamente flat — separazione degli elementi solo tramite bordi e contrasto colore.

**Fix in `app/globals.css`:**
| Selettore | Prima | Dopo |
|---|---|---|
| `.gt-canvas` | `box-shadow: 0 24px 80px rgba(0,0,0,0.25)` | `border: 1px solid var(--gt-border)` |
| `.gt-canvas` mobile (<640px) | `border-radius: 0; box-shadow: none` | `border: none; border-radius: 0` |
| `.gt-card:hover` | `box-shadow: 0 4px 20px rgba(0,0,0,0.1); transform: translateY(-1px)` | `border-color: var(--gt-text-secondary)` |

Risultato: zero shadow, zero lift, zero elevation. UI completamente piatta.

---

### 5. Riscrittura `DESIGN.md` come source of truth

**Problema:** `DESIGN.md` (tracked, committato 2026-04-08) descriveva ancora il **design Spotify** — due redesign fa. `DesignSystemInspiredbyNike.md` (untracked) documentava il Nike ma non era linkato da nessuna parte. Nessun file documentava GymTonic. Ogni futuro prompt "segui il design" rischiava di generare codice obsoleto.

**Decisione:** `DESIGN.md` diventa GymTonic-first, source of truth unico. Il Nike doc resta come reference legacy in `docs/`.

**Nuova struttura `DESIGN.md` (11 sezioni):**
1. Status & Migration Map — tabella per pagina (home=GymTonic, altre 5 pagine=Nike legacy)
2. Design Philosophy — GymTonic (cream + hero dark + lime accent, **flat**, 820px canvas)
3. Design Tokens — tutti i `--gt-*`
4. Typography — Barlow scale completa
5. Components — 50 classi `.gt-*` documentate
6. Animations — `gtFillBar`, `gtFadeUp` + timing staggered
7. Reusable primitives React — `useApp()`, `schedaColor()`, `weeklyStats`, `dateUtils`, modals
8. File map — dove vive cosa
9. Do's & Don'ts — GymTonic specifici (no shadow, no hardcoded hex, no mix `.nk-*`/`.gt-*`)
10. Legacy Nike phase-out plan — step per rimuovere Nike quando tutte le pagine saranno migrate
11. Agent prompt guide — esempi di prompt per future modifiche che referenziano `DESIGN.md`

**Verifica end-to-end:** tutte le 50 classi `.gt-*` citate in `DESIGN.md` esistono in `globals.css` (comparazione via `grep -oE '\.gt-[a-z-]+' | sort -u | comm`).

---

### 6. Spostamento `DesignSystemInspiredbyNike.md` → `docs/legacy-nike-design.md`

**Problema:** Il doc Nike era alla root del repo come file untracked, senza un posto logico dove vivere. Con `DESIGN.md` che ora è GymTonic-first, serviva un archivio coerente per la reference legacy.

**Fix:**
```bash
mkdir -p docs   # già esisteva
mv DesignSystemInspiredbyNike.md docs/legacy-nike-design.md
```

`DESIGN.md` linka il file nuovo in sezione 8 (File map) e sezione 10 (phase-out plan).

---

## Stato migrazione UI

| Pagina | Design | Status |
|--------|--------|--------|
| `app/(app)/home/page.tsx` | GymTonic | ✅ Migrata |
| `app/(app)/schede/page.tsx` | Nike | Da migrare |
| `app/(app)/settimana/page.tsx` | Nike | Da migrare |
| `app/(app)/mese/page.tsx` | Nike | Da migrare |
| `app/(app)/anno/page.tsx` | Nike | Da migrare |
| `app/(auth)/login/page.tsx` | Nike | Da migrare |
| `components/Nav.tsx` | Nike | Globale — restare finché altre pagine Nike |
| `components/modals/*.tsx` | Nike | Usati anche da home — migrarli insieme alle pagine |

---

## Riepilogo

| Metrica | Valore |
|---------|--------|
| Design system attivi | 2 (GymTonic su home, Nike sulle altre) |
| Design system rimossi | 1 (Spotify, 279 righe CSS + DM Sans) |
| Righe aggiunte in `globals.css` | ~354 (GymTonic + tokens + keyframes) |
| Classi `.gt-*` create | 50 |
| Classi `.nk-*` mantenute | ~90 (5 pagine le usano ancora) |
| Font aggiunti | 2 (Barlow, Barlow Condensed) |
| Font mantenuti per legacy | 2 (Anton, Archivo) |
| File design-doc riscritti | 1 (`DESIGN.md`) |
| File spostati | 1 (`DesignSystemInspiredbyNike.md` → `docs/legacy-nike-design.md`) |
| Bug fix | 1 (Turbopack cache stale) |
| Commit del giorno | 0 (tutto uncommitted a fine sessione) |
