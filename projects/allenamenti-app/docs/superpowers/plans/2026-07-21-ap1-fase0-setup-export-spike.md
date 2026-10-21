# AP1 Fase 0 — Setup, verifica repo & spike static export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verificare sul codice reale le assunzioni dello spec AP1 e provare lo static export, producendo un report che alimenta i piani dettagliati delle Fasi 2–6.

**Architecture:** Piano di *investigazione/spike*, non di feature. Ogni task produce un accertamento verificabile (build che passa/fallisce, inventario, artefatto) su un branch dedicato. Nessuna modifica distruttiva sul codice di produzione: si lavora su branch `ap1/fase0-spike`.

**Tech Stack:** Next.js 16 (App Router), React 19, Capacitor 8, Supabase (`supabase-js`), `idb` 8, Node/npm.

## Global Constraints

- Next.js 16 · React 19 · Capacitor 8 (valori dallo spec — confermare sul repo).
- Libreria offline: **`idb`** (NON Dexie).
- **Chiave Anthropic mai nel bundle** nativo — vincolo assoluto.
- App id Capacitor attuale: `com.fabriziolp.allenamenti` (rename brand → Vi.To pendente).
- Supabase project ref: `lzwyhokkvzxlnubsenmf`.
- Non modificare `main`/produzione: tutto su branch `ap1/fase0-spike`.
- Target architetturale: **Strada B** (bundle statico + Supabase diretto). Riferimento:
  `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md`.

---

## PREREQUISITO — repository disponibile

Questo piano parte quando il repo di Fabrizio è clonato nel workspace. Fino ad allora i
task non sono eseguibili. Tutti i comandi assumono la root del repo come working directory.

---

### Task 1: Baseline — repo clonato, dipendenze installate, web che gira

**Files:**
- Nessun file modificato (task di baseline/lettura).

**Interfaces:**
- Produces: conferma che il progetto builda e gira in dev; versioni reali di
  Next/React/Capacitor annotate per aggiornare i Global Constraints.

- [ ] **Step 1: Creare il branch di lavoro**

```bash
git checkout -b ap1/fase0-spike
```

- [ ] **Step 2: Installare le dipendenze**

```bash
npm install
```
Expected: install completo senza errori bloccanti. Annotare eventuali warning di peer deps.

- [ ] **Step 3: Registrare le versioni reali**

```bash
node -e "const p=require('./package.json');console.log(JSON.stringify({next:p.dependencies.next,react:p.dependencies.react,cap:p.dependencies['@capacitor/core'],idb:p.dependencies.idb,supabase:p.dependencies['@supabase/supabase-js']},null,2))"
```
Expected: stampa le versioni. Confrontarle con i Global Constraints; se divergono, aggiornare lo spec.

- [ ] **Step 4: Avviare il dev server e verificare che l'app carichi**

```bash
npm run dev
```
Expected: server su `http://localhost:3000`, home che renderizza. Se serve auth Supabase,
annotare se il login funziona in locale (env vars presenti?). Fermare con Ctrl-C.

- [ ] **Step 5: Commit del branch (nessuna modifica codice, solo checkpoint)**

```bash
git commit --allow-empty -m "chore(ap1): baseline fase0 spike branch"
```

---

### Task 2: Inventario architetturale (il documento di verità della Fase 0)

**Files:**
- Create: `docs/superpowers/notes/ap1-fase0-inventory.md`

**Interfaces:**
- Consumes: repo installato (Task 1).
- Produces: `ap1-fase0-inventory.md` con 4 tabelle (pagine, route API, moduli lib,
  native/PWA) che i piani delle Fasi 2–4 useranno come input.

- [ ] **Step 1: Elencare le pagine e marcare quelle non-`'use client'`**

```bash
# tutte le page/layout dell'App Router
find app -name "page.tsx" -o -name "layout.tsx" | sort
# quali NON dichiarano 'use client' in cima
for f in $(find app -name "page.tsx" -o -name "layout.tsx"); do \
  head -1 "$f" | grep -q "use client" || echo "SERVER-ish: $f"; done
```
Expected: elenco delle 18 pagine; le voci "SERVER-ish" sono le candidate a rischio export (§Fase 1).

- [ ] **Step 2: Elencare le route API e stimare thin-wrapper vs logica**

```bash
find app/api -name "route.ts" | sort
# indizio di logica server-only: uso di chiavi/Anthropic
grep -rl -i "anthropic\|process.env" app/api || true
```
Expected: ~16 route; le route che toccano `anthropic`/env sono il **Gruppo B** (Edge Function).

- [ ] **Step 3: Localizzare i moduli chiave dello stack**

```bash
ls -1 lib/ 2>/dev/null
sed -n '1,40p' capacitor.config.ts
cat next.config.ts
ls -la public/ 2>/dev/null
test -f server.js && echo "server.js PRESENTE (legacy Express)" || echo "server.js assente"
```
Expected: conferma di `lib/idb.ts`, `lib/liveStore.ts`, `lib/auth.ts`; `capacitor.config.ts`
con `server.url`; `next.config.ts` vuoto; `public/` vuota (no manifest/SW); stato `server.js`.

- [ ] **Step 4: Scrivere il file di inventario con i risultati**

Creare `docs/superpowers/notes/ap1-fase0-inventory.md` con quattro tabelle compilate
con l'output reale degli step 1–3:

```markdown
# AP1 Fase 0 — Inventario (dati reali dal repo)

## Pagine (export-safety)
| Path | 'use client'? | Rischio export | Note |
|---|---|---|---|

## Route API (migrazione)
| Path | Gruppo (A thin / B logica) | Target (supabase-js / Edge Fn) |
|---|---|---|

## Moduli lib rilevanti
| File | Ruolo | Tocca in fase |
|---|---|---|

## Stato native / PWA
| Elemento | Stato attuale | Azione |
|---|---|---|
| capacitor server.url | | rimuovere (Fase 4) |
| public/ manifest+SW | | creare (Fase 3) |
| piattaforma android | | aggiungere (Fase 4) |
| server.js legacy | | dismettere (Fase 2) |
```

- [ ] **Step 5: Commit dell'inventario**

```bash
git add docs/superpowers/notes/ap1-fase0-inventory.md
git commit -m "docs(ap1): inventario architetturale fase 0"
```

---

### Task 3: Spike static export — il gate che conferma/smentisce la Strada B

**Files:**
- Modify: `next.config.ts` (su branch spike — reversibile)
- Create: `docs/superpowers/notes/ap1-fase0-export-spike.md`

**Interfaces:**
- Consumes: inventario (Task 2) — in particolare le pagine "SERVER-ish" e le route API.
- Produces: verdetto export (clean / lista bloccanti) + report che dimensiona la Fase 1–2.

- [ ] **Step 1: Abilitare l'export statico**

Impostare in `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // export non supporta l'ottimizzazione immagini runtime
};

export default nextConfig;
```

- [ ] **Step 2: Tentare la build ed osservare i bloccanti**

```bash
npm run build 2>&1 | tee /tmp/ap1-export-build.log
```
Expected (ipotesi da verificare, NON assunzioni): la build fallisce e i bloccanti tipici
emergono nel log — (a) **route handlers `app/api/*`** incompatibili con `output: 'export'`;
(b) **dynamic routes** (`[id]`) senza `generateStaticParams`; (c) uso di API server-only
nelle pagine "SERVER-ish". Registrare gli errori **reali** dal log, non quelli attesi.

- [ ] **Step 3: Classificare ogni bloccante**

Per ogni errore nel log, annotare: file, causa, e a quale fase appartiene la soluzione
(route API → Fase 2 migrazione a `supabase-js`/Edge Fn; dynamic route → `generateStaticParams`
in Fase 1; server-only in pagina → refactor in Fase 1).

- [ ] **Step 4: Scrivere il report dello spike**

Creare `docs/superpowers/notes/ap1-fase0-export-spike.md`:

```markdown
# AP1 Fase 0 — Spike static export

**Esito:** [clean / fallita con N bloccanti]

## Bloccanti rilevati (dal log reale)
| Errore | File | Causa | Fase di soluzione |
|---|---|---|---|

## Verdetto Strada B
[La SPA regge `output: 'export'` dopo aver spostato le route? Sì/No + condizioni.]

## Stima impatto su Fasi 1–2
[Quante route da migrare, quante dynamic route da parametrizzare, quali pagine da refactor.]
```

- [ ] **Step 5: Commit dello spike (config export resta sul branch, NON su main)**

```bash
git add next.config.ts docs/superpowers/notes/ap1-fase0-export-spike.md
git commit -m "spike(ap1): static export output=export + report bloccanti"
```

---

### Task 4: Verifica scaffolding Android (informa la Fase 4, non-distruttivo)

**Files:**
- Nessun commit del generato (si verifica e si scarta): `android/` resta ignorato o rimosso.

**Interfaces:**
- Consumes: repo con Capacitor (Task 1).
- Produces: conferma che `cap add android` genera la piattaforma; note su appId/permessi.

- [ ] **Step 1: Verificare Capacitor CLI e piattaforme presenti**

```bash
npx cap ls 2>&1 | tee /tmp/ap1-cap-ls.log
```
Expected: elenca `ios` presente, `android` assente (coerente con lo spec).

- [ ] **Step 2: Tentare l'aggiunta della piattaforma Android (a secco, per verifica)**

```bash
npx cap add android 2>&1 | tee /tmp/ap1-cap-android.log
```
Expected: genera `android/` senza errori (richiede Android SDK/Studio installati). Se fallisce
per SDK mancante, **annotare il prerequisito** — è un item di setup ambiente, non un blocco di codice.

- [ ] **Step 3: Annotare l'esito e ripulire il generato di prova**

```bash
git status --porcelain | grep android || true
rm -rf android   # non committiamo il generato in questa fase di verifica
```
Aggiungere l'esito (successo/prerequisito mancante) al file `ap1-fase0-inventory.md`,
riga "piattaforma android".

- [ ] **Step 4: Commit della nota**

```bash
git add docs/superpowers/notes/ap1-fase0-inventory.md
git commit -m "docs(ap1): esito verifica scaffolding android"
```

---

### Task 5: Report di sintesi Fase 0 → input per i piani Fasi 2–6

**Files:**
- Create: `docs/superpowers/notes/ap1-fase0-findings.md`

**Interfaces:**
- Consumes: inventario (Task 2), spike export (Task 3), verifica Android (Task 4).
- Produces: findings consolidati che diventano il punto di partenza dei piani dettagliati
  di Fase 2 (data layer), Fase 3 (offline), Fase 4 (native).

- [ ] **Step 1: Consolidare i tre artefatti in un report decisionale**

Creare `docs/superpowers/notes/ap1-fase0-findings.md`:

```markdown
# AP1 Fase 0 — Findings & next actions

## 1. Assunzioni dello spec: confermate / smentite
| Assunzione (spec) | Esito reale | Impatto |
|---|---|---|
| SPA regge output:'export' | | |
| 14 route thin, 2 con logica | | |
| public/ vuota (no SW/manifest) | | |
| ios scaffoldato, android assente | | |

## 2. Bloccanti export e loro fase di soluzione
[dal report spike]

## 3. Prerequisiti di ambiente
[Android SDK, account Apple Dev, ecc.]

## 4. Ordine consigliato dei piani successivi
1. Piano Fase 2 (data layer) — precondizione all'export pulito
2. Piano Fase 1 completamento (export pulito dopo rimozione route)
3. Piano Fase 3 (offline/OFF1)
4. Piano Fase 4 (guscio nativo + Android)
```

- [ ] **Step 2: Compilare la sezione 1 e 4 con i dati reali degli altri artefatti**

Riempire le tabelle con gli esiti di Task 2–4. La sezione 4 fissa l'ordine effettivo
in base a cosa lo spike ha rivelato (tipicamente: la migrazione route precede l'export pulito).

- [ ] **Step 3: Commit del report**

```bash
git add docs/superpowers/notes/ap1-fase0-findings.md
git commit -m "docs(ap1): findings fase 0 e piano dei piani successivi"
```

- [ ] **Step 4: Push del branch per revisione con Fabrizio**

```bash
git push -u origin ap1/fase0-spike
```
Expected: branch pubblicato; aprire eventuale PR di sola documentazione/spike per discussione.

---

## Self-Review (esito)

- **Spec coverage:** questo piano copre lo spec §2 Fase 0 e l'avvio Fase 1 (spike export),
  §6 (cosa serve dal repo), §5 (rischi: export-safety, Anthropic, migrazioni). Le Fasi 2–6
  dello spec restano scoperte **per scelta**: richiedono i file reali e avranno piani
  dedicati alimentati da `ap1-fase0-findings.md`.
- **Placeholder scan:** gli "Expected" dello spike (Task 3) sono ipotesi *esplicitamente
  marcate come da verificare sul log reale*, non placeholder di implementazione. Nessun
  "TBD/TODO" di codice.
- **Type consistency:** n/a (piano di investigazione, nessuna firma di funzione condivisa
  tra task oltre ai nomi-file, che coincidono).
```
