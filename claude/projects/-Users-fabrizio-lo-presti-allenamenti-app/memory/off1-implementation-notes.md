---
name: off1-implementation-notes
description: Considerazioni tecniche da ricordare quando si implementa OFF1 (Live offline-first)
metadata: 
  node_type: memory
  type: project
  originSessionId: 6e3adec2-0064-4ae9-9788-223c566b3744
---

Note tecniche per l'implementazione di **OFF1 — Modalità Live offline-first + preload proattivo Schede** (prio 1 del tier alta, decisa 2026-07-14; spec `docs/SPEC_OFFLINE_LIVE.md`). Da rivedere con l'utente **prima di iniziare** l'implementazione. Vedi anche [[backlog-source-of-truth]].

**Flag / decisioni aperte da sciogliere prima:**
1. **Libreria IDB — `idb` vs Dexie.** La spec dice **Dexie**, ma il progetto usa già la libreria **`idb`** (v8, `lib/idb.ts`). Raccomando **restare su `idb`** per non frammentare lo stack; adottare Dexie solo se serve davvero (query complesse).
2. **Poll di refresh cache (spec §3.5.2).** La spec riusa "il poll del badge" — ma quel poll è introdotto da **MNGMT1**, che nell'ordine viene **dopo** OFF1. Quindi in OFF1 il refresh cache parte da **app-open** (+ eventuale poll proprio leggero); l'aggancio al poll badge si fa quando MNGMT1 sarà in piedi.
3. **Idempotenza sync.** Oggi i salvataggi Live vanno via **`POST /api/workouts` (REST route)**, non via RPC Postgres. La spec vuole idempotenza su `client_mutation_id` lato RPC. Decidere: introdurre RPC idempotenti o gestire `client_mutation_id` nell'endpoint REST esistente.

**Base già esistente (OFF1 ESTENDE, non riparte da zero):**
- La Live persiste già `ActiveSession` in IndexedDB (`lib/liveStore.ts` → `lib/idb.ts` `saveActiveSession`/`getActiveSession`).
- Esiste già una **coda pending-workout con retry**: `enqueuePendingWorkout` in `lib/idb.ts`, flush automatico all'avvio in `app/(app)/AppLayoutClient.tsx`.
- **Novità reali di OFF1:** (a) preload proattivo cache schede (ultime 2, LRU per `assigned_at`); (b) coda mutation idempotente con `client_mutation_id`; (c) indicatore stato offline in UI sessione; (d) app-shell **Workbox** perché la Live si *apra* offline (non solo salvi).

**Migration:** `ALTER TABLE schede ADD COLUMN assigned_at timestamptz NOT NULL DEFAULT now()` + backfill (`= data_inizio` se presente, altrimenti `now()`). **Applicare e verificare sul DB remoto** (ref `lzwyhokkvzxlnubsenmf`) — lezione q1_infra: una migration locale non è detto sia applicata al remoto, controllare sempre dopo l'apply.

**Stato git:** il commit del backlog+spec di OFF1 (`dcf9907`) è **solo locale, non pushato** (scelta dell'utente 2026-07-14). Un push futuro lo includerà.
