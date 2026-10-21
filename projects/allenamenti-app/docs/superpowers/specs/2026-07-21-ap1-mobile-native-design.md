# AP1 — Trasposizione Vi.To in app nativa iOS + Android (Strada B)

> **Design spec.** Redatto 2026-07-21 come piano d'azione per la conversione di Vi.To
> da web app (WebView remota) a vera app nativa iOS + Android.
> Fonti: `docs/BACKLOG.md`, `docs/STACK_MOBILE_analisi_locale.md`,
> `docs/Vito_guida_AP1_backlog.docx`.
> **Stato:** approvato come impianto (2026-07-21). Verifiche sul codice reali pendenti
> all'arrivo del repository.

---

## 0. Contesto e decisioni prese

**Cos'è Vi.To:** app di allenamento. Un *trainer* crea/importa schede (da PDF), le
assegna a un *trainee*, che le esegue in modalità **Live** (timer, tracking
serie/carichi/reps, storico, progressioni). Oggi è una web app in produzione su Vercel
(`allenamenti-app.vercel.app`) con backend Supabase.

**Problema:** l'attuale "app iOS" è un guscio Capacitor che carica la URL Vercel in
**WebView remota** — non contiene l'app. Conseguenze: online-obbligatoria (incompatibile
con l'offline), rischio rifiuto App Store (Apple Guideline 4.2), nessun accesso nativo.

**Decisioni prese (2026-07-21):**
1. **Strada B vincolante da subito** — bundle statico locale + client ↔ Supabase diretto.
   Si costruisce tutto (offline incluso) su questa architettura, *prima* di OFF1.
2. **iOS + Android insieme** — architettura cross-platform da giorno 1. Bundle web
   condiviso; il lavoro nativo-specifico (signing, push) si sdoppia.
3. **iOS primo canale di distribuzione** — account Apple Developer in apertura →
   Xcode → **TestFlight**. Android da servire comunque (piattaforma da aggiungere presto).
4. Lavoro in tandem con Fabrizio.

**Sotto-decisioni adottate come default** (confermabili sul repo):
- AI (`import-pdf`, `motivation`) → **Supabase Edge Function** (non Vercel fn).
- Push (R3/INV2) → **OneSignal** (gestisce iOS+Android con Capacitor).
- Libreria offline → **`idb`** (già in uso, no Dexie).
- Route CRUD → **eliminate** sul target nativo; eventuale fallback web da valutare.
- `server.js` (Express legacy) → **dismesso**.

---

## 1. Architettura target

```
┌─────────────────────────────────────────┐
│  App nativa (Capacitor) — iOS + Android  │
│  ┌─────────────────────────────────────┐ │
│  │  Bundle statico locale (Next export)│ │  ← asset impacchettati, NO server.url
│  │  React SPA + Zustand + idb          │ │
│  │  Workbox (app-shell offline)        │ │
│  └──────────────┬──────────────────────┘ │
└─────────────────┼────────────────────────┘
                  │ supabase-js diretto (JWT + RLS)
                  ▼
        ┌──────────────────────┐   ┌────────────────────────┐
        │  Supabase (Postgres) │   │  Edge Function (AI)     │
        │  Auth · RLS · RPC    │   │  import-pdf · motivation│  ← chiave Anthropic qui
        └──────────────────────┘   └────────────────────────┘
```

**Principi cardine:**
- Il client parla **diretto con Supabase**; la **RLS** è la guardia di sicurezza.
- Vercel/Next si riduce al solo pezzo AI, o lo si sostituisce con Edge Function.
- La **chiave Anthropic non entra MAI** nel bundle nativo (vincolo assoluto).
- Nessuna azione utente aspetta la rete (fondamento condiviso con OFF1).

---

## 2. Workstream e sequenza

L'ordine rispetta il vincolo "Strada B prima di OFF1".

### Fase 0 — Setup & verifica repo
- Ambienti build: Xcode (iOS) + Android Studio (Android).
- Account: Apple Developer (in apertura), Google Play Console (da avviare).
- Verifica dello stack sul codice reale (vedi §6 — cosa serve dal repo).

### Fase 1 — Static export
- `next.config.ts` → `output: 'export'` (oggi vuoto).
- Verificare che le **18 pagine** reggano l'export: le 14 `'use client'` sono a basso
  rischio; le 4 non-client vanno ispezionate per feature server-only.
- Gestire asset e routing statici (immagini, dynamic routes, fallback).

### Fase 2 — Data layer diretto
- **14 route CRUD** (`schede`, `workouts`, `weight-logs`, `config`, …) → chiamate
  `supabase-js` dirette dal client, protette da RLS.
- **2 route AI** (`import-pdf`, `motivation`) → **Supabase Edge Function** (chiave
  Anthropic lato server).
- **`config/key`**: valutare — la key non deve stare client-side (candidata a Edge/server).
- Dismettere **`server.js`** (Express legacy) e `config.json` associato.

### Fase 3 — Offline (OFF1) sul target B
- **Workbox app-shell**: l'app deve *aprirsi* offline (da creare da zero — `public/` oggi vuota).
- **Cache schede** in IndexedDB (`idb`): albero completo delle ultime 2 schede
  (LRU per `assigned_at`), refresh non bloccante su app-open.
- **Coda di sync idempotente**: `client_mutation_id` (UUID) + idempotenza lato RPC;
  retry exponential backoff; flush su evento `online`.
- **Migration** `schede.assigned_at` (additiva) — applicare *e verificare sul remoto*.
- Estende l'infra IDB/queue già esistente (`lib/liveStore`, `lib/idb`,
  `enqueuePendingWorkout`), non riparte da zero.

### Fase 4 — Guscio nativo
- Capacitor: **rimuovere `server.url`**, servire gli asset locali dal bundle.
- **Aggiungere piattaforma Android** (`android/`, oggi assente).
- **CSP webfont**: Barlow via CDN è bloccato in alcuni contesti → inline `@font-face`
  data-URI o font di sistema.
- **Deep-link / auth redirect**: verificare il flusso Supabase Auth via redirect in
  WebView nativa (fragilità già documentata su INV1 `?ref=`).

### Fase 5 — Feature native (sbloccate da AP1)
- **Push** (R3, INV2) → OneSignal.
- **Haptics** → `@capacitor/haptics` (oggi `navigator.vibrate`).
- **Dettatura** (F7) → dettatura nativa (Web Speech API assente in WKWebView).

### Fase 6 — Distribuzione
- **Signing** iOS (Apple Dev) + Android (keystore Play).
- **TestFlight** (iOS) come primo canale; beta Play per Android.
- Submission store. Il bundle reale risolve il rischio Apple 4.2.

---

## 3. Sotto-decisioni (con razionale)

| Tema | Scelta | Razionale |
|---|---|---|
| AI (`import-pdf`, `motivation`) | **Edge Function** | Un solo backend, coerente Supabase-centric |
| Push (R3/INV2) | **OneSignal** | Raccomandato con Capacitor; gestisce iOS+Android |
| Libreria offline | **`idb`** | Già in uso; evita frammentazione (deciso nei doc) |
| Route CRUD | **Eliminate** (nativo) | RLS già protegge; fallback web da valutare |
| `server.js` Express | **Dismesso** | Residuo pre-Next |

---

## 4. Coordinamento con Fabrizio (fuori dal codice)

- Account **Apple Developer** (in apertura) e **Google Play Console** (da avviare).
- Rename brand **ALLENAMENTI → Vi.To** (asset store, icone, splash).
- Nominare il **superadmin** (se/quando entra MNGMT1).
- Conferma su cosa resta PWA-web e cosa diventa esclusivamente nativo.

---

## 5. Rischi noti (da verificare sul repo)

- **Export-safety** delle 4 pagine non-`'use client'` (possibili feature server-only).
- **CSP webfont** Barlow.
- **Auth redirect Supabase** in WebView nativa (deep-link).
- **Chiave Anthropic** mai nel bundle — vincolo assoluto.
- **Migrazioni Supabase**: applicare *e verificare sul remoto* (lezione `q1_infra`).

---

## 6. Cosa serve dal repo (Fase 0)

Da verificare sul codice reale prima di dettagliare il piano implementativo:
- Export-safety reale delle pagine (in particolare le 4 non-`'use client'`).
- Quanto sono "thin" le 14 route CRUD (per la migrazione a `supabase-js`).
- Stato dello scaffold iOS Capacitor (`ios/App`, `capacitor.config.ts`).
- Presenza/assenza di `manifest` / service worker in `public/`.
- Config Supabase (ref `lzwyhokkvzxlnubsenmf`) e struttura `lib/auth.ts` / `lib/idb.ts`.

---

## 7. Ambito e sequenza rispetto al backlog

Questa spec copre **AP1 + migrazione architetturale Strada B + OFF1** come spina dorsale.
Le altre feature web-first (MNGMT1, R2, INV1/2, H1) restano fuori scope qui e vanno in
spec separate; MNGMT1 introduce RPC `SECURITY DEFINER` **già allineate alla Strada B**,
quindi non confligge. F10, Q1, SEC1 sono web-side e indipendenti da AP1.

---

*Prossimo passo: piano implementativo dettagliato (skill writing-plans), da agganciare al
repository quando disponibile. La verifica di Fase 0 sul codice reale può modificare i
dettagli delle Fasi 1–2.*
