# Vi.To — Backlog

> Fonte di verità per feature aperte, decisioni prese e lavoro completato.
> Aggiornare questo file ad ogni sessione di sviluppo e committarlo (commit `docs:` dedicato).
> Per specifiche tecniche dettagliate vedere `docs/SPEC_FIX5_Q1infra_F6.md`.
> Per AP1: `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md` (spec, fonte di verità architetturale) e `docs/superpowers/notes/` (esiti Fase 0).

---

## 🎯 Stato & priorità (2026-10-13)

Flusso **Live completo** (F0–F6, F8, F9, FIX5, FIX5b, FIX6). **Redesign mobile (G1)** e
**Profilo (R1)** fatti e pushati. **AP1 Fase 0 (setup + spike export) eseguita**: esito e note in `docs/superpowers/notes/`.

**Cambio di priorità (2026-10-13): AP1 passa da "secondaria" a percorso critico.**
Motivo: OFF1 (e di fatto tutto ciò che tocca dati e RLS) presuppone l'architettura target di AP1 (Strada B: bundle statico + client↔Supabase diretto). Costruire OFF1 o MNGMT1 prima significherebbe rifare lavoro. Stima AP1 completo: ~40–68 giornate-persona (calendario realistico 4–7 mesi, OFF1 incluso) — è di fatto la voce più grande del backlog, non un "packaging".

**Ordine di esecuzione (deciso 2026-10-13):**
1. 🔧 **Igiene & sicurezza** (vedi sezione AP1-0)
2. 🔴 **AP1 Fase 2 — data layer diretto** (14 route → `supabase-js`, audit RLS, Edge Function AI, dismissione `server.js`)
3. 🔴 **AP1 Fase 1 — static export** (dopo la Fase 2, non prima: lo ha confermato lo spike)
4. 🔴 **App iOS minima** (Capacitor su asset locali, login funzionante)
5. 🟢 **OFF1** (costruito già sul target Strada B)
6. 🟠 **Push / haptics / dettatura** (R3 · INV2-push · F7 · `@capacitor/haptics`)
7. 🟠 **TestFlight → store**, poi **Android**

**Feature web-first in pausa fino all'app iOS minima:** MNGMT1 · R2 · INV1 · INV2 · H1.
Riprendono dopo il punto 4 (MNGMT1 subito dopo OFF1, come già deciso: fondazione di R2/INV1/Inbox e attivazione SEC1).

⚠ **Note di sequencing:**
- **OFF1** resta priorità di prodotto n.1, ma tecnicamente **dipende da AP1 Fasi 1–2** (architettura Strada B). Non è parallelo ad AP1.
- **MNGMT1** introduce RLS cross-utente: le sue policy e l'**audit RLS di AP1 Fase 2** devono usare **lo stesso documento di riferimento**, per non scrivere due volte le stesse policy con assunzioni diverse.
- **SEC1** non è più "dormiente": con accesso diretto dal client il margine di errore sulla RLS si riduce → **assorbita nell'audit RLS di AP1 Fase 2** (vedi voce SEC1).
- **INV2** — la tensione con AP1/push si scioglie con MNGMT1: la tabella `notifiche` (poll, no push) consente una notifica **in-app** all'invitante; il push vero arriva con il passo 6.
- **F10 / Q1** sono web-side e non dipendono da AP1; in bassa per scelta di priorità.

**Contesto registrazione (2026-05-29):** schermata unica ACCEDI/REGISTRATI, solo
email + password. Nessun nome, nessun onboarding, nessuna distinzione trainer/trainee.
Brand attuale "ALLENAMENTI" (da rinominare **Vi.To**). Prod: `allenamenti-app.vercel.app`.

---

## Stato app — snapshot 2026-10-13

| Area | Stato |
|---|---|
| Live F0–F6, F8, F9 | ✅ done + commitato |
| Q1-infra (data layer) | ✅ done — migration applicata in prod |
| FIX5 / FIX5b (timer recupero) | ✅ done — `13edf15` / `2589a96` |
| R4 (riordino esercizi) | ✅ done — commit `693e972` |
| FIX6 (blocchi circuito AMRAP) | ✅ done — `d9d60f0`+`0edcb10` |
| R1 (Profilo + Preferenze) | ✅ done — commit `b944a36` |
| G1 (redesign mobile) | ✅ done — `f5fe143`…`dab0a3e` |
| AP1 Fase 0 (setup + spike export) | ✅ eseguita — note in `docs/superpowers/notes/` |
| AP1 igiene + Fase 2 | ⏳ in avvio (vedi sezione AP1) |
| F5 originale | 🟡 superseded da FIX5 |
| Resto backlog | ⏳ aperto |

---

# 🔴 APERTI

## 🔴 Percorso critico — AP1

### AP1 — Trasposizione in app nativa iOS + Android (Strada B)
**Spec:** `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md` · **Design igiene + Fase 2:** `docs/superpowers/specs/2026-10-13-ap1-igiene-fase2-design.md` (in revisione). **Prio:** percorso critico (dal 2026-10-13). **Target:** iOS prima (TestFlight), poi Android.

**Obiettivo:** passare da "sito Vercel in WebView remota" (Capacitor con `server.url`, online-only, a rischio Apple Guideline 4.2) a **vera app**: bundle statico locale + client che parla direttamente con Supabase (RLS come guardia). Sblocca offline reale (OFF1), push, haptics, dettatura nativa.

**Decisioni prese (non rimettere in discussione):**
- Architettura = **Strada B**: `output:'export'` + `supabase-js` diretto. Niente WebView remota come destinazione.
- **La chiave Anthropic non entra mai nel bundle nativo.** `import-pdf` → Supabase **Edge Function**, con chiave **dedicata** (`ANTHROPIC_API_KEY_EDGE`, secret su Supabase, mai in chat), JWT obbligatorio e limite per utente; limite di spesa sulla console Anthropic; la vecchia chiave si revoca da Vercel a migrazione finita.
- Route **`motivation`**: eliminata (nessuna chiamata dalla UI; resta nella storia git; Q1 la riscriverà se serve).
- Le **14 route CRUD** migrano a `supabase-js` diretto; **`server.js` (Express) e il codice legacy versionato** (`supabaseClient.js`, `migrate-data.js`, script `start:express`, dipendenze express/multer/dotenv) vengono eliminati. I file locali non versionati (`data.json`, `backups/`, `config.json`) non si toccano.
- **Duplica scheda** → RPC Postgres atomica (tutto o niente). Copia **tutti** i campi degli esercizi (`sets_target`, `exercise_id`, `rest_seconds`, …) **e i blocchi AMRAP** (rimappando `blocco_id`); `data_inizio`/`weeks` restano vuoti (la copia è un nuovo periodo).
- Anche il **web su Vercel diventa il build statico** (un solo build, un solo percorso dati). Fino alla validazione dell'export il web resta Next con server.
- Libreria offline = **`idb`** (non Dexie).
- Rilascio Fase 2 **a piccoli passi su main**, ogni risorsa migrata va in produzione dopo verifica ed è **retrocompatibile**.
- Test: **Vitest** per funzioni pure del nuovo livello dati e parsing `import-pdf` + **script di test RLS con due utenti di test** (utente 1 non legge/scrive dati di utente 2). Prove su produzione con utenti di test dedicati (`TEST_USER_*` in `.env.local`), niente operazioni distruttive. Un progetto Supabase di sviluppo separato va valutato **prima di MNGMT1** (7 migration).
  - ⚠ RLS, colonne user_id e policy di schede, giorni, esercizi, allenamenti e pesi sono state applicate a mano, fuori dalle migration: prima di creare un progetto di sviluppo o di partire con MNGMT1 serve una migration che le ricrei. (Verificato il 2026-10-14: `docs/superpowers/notes/ap1-storico-migration.md`.)
- **Bundle ID definitivo: `com.fabriziolp.vito`** (iOS e Android), nome «Vi.To» sotto l'icona. Non cambia più dopo il primo upload store.
- **Auth dall'app:** reset password e conferma email aprono il **sito web**, si completa lì, poi login nell'app (nessuna config nativa/Universal Links per ora; rivalutare con INV1/R2). Sessione salvata in **`@capacitor/preferences`** (storage nativo) con storage adapter custom per supabase-js — non nel localStorage della WebView (iOS può svuotarlo). **Keychain: rivalutare prima di MNGMT1.** Con Preferences il token resta in chiaro in un file dell'app e finisce nei backup; passare al Keychain costa circa 20 righe in `lib/supabase.ts`.
- Esecuzione: piani con **subagent in Fase 2**, ma la **prima risorsa migrata si fa in sessione** per fissare le convenzioni del livello dati; poi si parallelizza.

**Fasi (stime giornate-persona):**

| Fase | Contenuto | Stima |
|---|---|---|
| 0 | Setup, inventario, spike export, verifica Android | ✅ fatta |
| Igiene | vedi AP1-0 sotto | 1–3 gg |
| 2 | Data layer diretto: 14 route → `supabase-js`, **audit RLS**, Edge Function AI, dismissione `server.js`, test | 10–18 gg |
| 1 | Static export: `next.config.ts`, 4 pagine non-client, dynamic routes, asset; Vercel passa al build statico | 3–6 gg |
| 4 | Guscio nativo: rimozione `server.url`, CSP webfont, auth/storage nativi → **app iOS minima** | 6–10 gg |
| 3 | **OFF1** (vedi voce dedicata) | 10–15 gg |
| 5 | Push (OneSignal vs `@capacitor/push-notifications`), haptics, dettatura (F7) | 5–8 gg |
| 6 | Signing, rebrand icone/splash, TestFlight, beta, submission; poi Android | 5–8 gg dev + 1–4 sett. di calendario |

#### AP1-0 — Igiene & sicurezza (primo passo, su main, con build + prova locale prima di ogni push)
- [x] **Revocare il token GitHub** presente in `.git/config` (Fabrizio), poi rimuoverlo dall'URL e usare portachiavi macOS con token nuovo *fine-grained* (solo questo repo, con scadenza). — revocato; URL pulito e portachiavi attivo il 2026-10-14 (il token nuovo si inserisce al primo push).
- [x] **Aggiornamenti di sicurezza:** Next ≥ 16.3.8, Capacitor 8.5.x, `npm audit fix` — build + giro manuale sul flusso Live prima del push. — Next 16.3.8, Capacitor 8.5.2; audit da 11 vulnerabilità a 3 moderate, solo nel tooling di Capacitor (2026-10-14).
- [x] **Riallineare lo storico migration Supabase:** rinominare i file locali con le versioni remote e registrare `live_mode` come già applicata. Si tocca solo la tabella dello storico, non lo schema. Prima: `list_migrations` come fotografia. — fatto il 2026-10-14, nota `docs/superpowers/notes/ap1-storico-migration.md`.
- [ ] **Leaked password protection** di Supabase Auth: attivarla dal dashboard (Fabrizio; potrebbe non essere disponibile su tutti i piani).
- [x] Verificare il contenuto di `dcf9907` (tenuto locale il 14/07) prima di pubblicarlo su main. — verificato e approvato il 2026-10-13; si pubblica col primo push.
- [x] Porre su main solo le 3 note di Fase 0 (non il `next.config` con l'export) e cancellare `ap1/fase0-spike`. — `06276de`, 2026-10-13.
- [x] Spostare spec, piano e prompt AP1 in `docs/superpowers/` e committarli; eliminare le copie duplicate (`BACKLOG.md`/`STACK_MOBILE` in `docs/conversione_app/`); il `.docx` resta fuori da git. — `06276de`, 2026-10-13.
- [x] Cancellare i branch vecchi (`handoff-backup`, `claude/gallant-cannon`, `claude/inspiring-franklin`, `claude/vigorous-thompson`). — 2026-10-13.
- [x] Eliminare il codice legacy versionato (vedi sopra). — 2026-10-14, insieme alle route morte `motivation`, `config`, `config/key`.

#### Task AP1 emersi dall'analisi di rischio (non coperti prima)
- [x] **Audit RLS tabella per tabella** (SELECT/INSERT/UPDATE/DELETE incl. `WITH CHECK`) su `schede`, `workouts`, `weight-logs`, `config` e tabelle collegate, come **artefatto a sé** (`docs/superpowers/notes/`), **prima di spegnere la prima route CRUD**. Include la revisione SEC1. Condiviso con il disegno RLS di MNGMT1. — 2026-10-20: `docs/superpowers/notes/rls-audit.md`; correzione con la migration `20261020213547_rls_riferimenti` (test RLS 42/42).
- [ ] **Mini-spike fattibilità `import-pdf` su Edge Function** (runtime Deno: limiti di tempo, dimensione payload, librerie di parsing PDF). Se non regge, ripiego = piccola funzione Vercel chiamata via rete (cambia dove sta la chiave: decidere dopo la prova).
- [ ] **Cancellazione account in-app** (requisito Apple per app con creazione account) — task esplicito prima di TestFlight/submission.
- [ ] **App Privacy "nutrition label"** (dati raccolti: email, dati di allenamento) da compilare in App Store Connect prima della submission.
- [ ] **Spike auth deep-link/redirect** in WebView nativa (mezza giornata) nella fase del guscio nativo, prima di dare la fase per chiusa.
- [x] **Utenti di test:** due utenti dedicati (`TEST_USER_EMAIL/PASSWORD`, `TEST_USER_2_EMAIL/PASSWORD`) in `.env.local`. — pronti il 2026-10-20.
- [x] **Webfont CSP:** Barlow via CDN bloccato in alcuni contesti → inline `@font-face` data-URI o font di sistema. — verificato in Fase 0, font nel bundle.

**Decisioni ancora aperte:**
1. **Account Apple Developer:** stato (attivo / in apertura / da richiedere) e tipo (individuale consigliato salvo società per Vi.To). L'account gratuito basta per provare sul proprio iPhone (firma 7 giorni); quello a pagamento serve per TestFlight. Prenotare il nome «Vi.To» in App Store Connect appena attivo. **Stato (2026-10-13): non ancora richiesto.**
2. **Icona e splash Vi.To:** file già disponibili o per ora placeholder? → **per ora placeholder** (2026-10-13).
3. **Push:** `@capacitor/push-notifications` vs OneSignal (raccomandato con Capacitor).
4. **Play Console (Android):** i nuovi account personali richiedono un periodo di closed test con un numero minimo di tester prima della produzione → verificare i requisiti attuali e partire presto.
5. Quali feature restano PWA e quali diventano native.

**Rischi principali:** (1) sicurezza del passaggio a client↔Supabase diretto (RLS da *dimostrare*, non assumere); (2) auth redirect/deep-link; (3) fattibilità Edge Function PDF; (4) divergenza web/nativo se il web resta su route Next; (5) assenza di rete di sicurezza → mitigata da Vitest + script RLS (valutare 5–6 test e2e Playwright sul flusso Live); (6) review Apple/Google non comprimibile; (7) carico paragonabile a un secondo prodotto per una persona sola + agente.

**Dipende da:** niente di bloccante tecnico. **Blocca:** OFF1, MNGMT1 (RLS), F7, R3, INV2-push, haptics.

---

## 🟢 Priorità alta — feature prodotto (web-first)

> ⏸ Tutte in pausa fino all'**app iOS minima** (vedi ordine). OFF1 è la prima a ripartire.

### OFF1 — Modalità Live offline-first + preload proattivo Schede
**Spec:** `SPEC_OFFLINE_LIVE.md` (**da aggiornare** con le decisioni sotto). **Dipendenze:** **AP1 Fasi 1–2 + app iOS minima** (architettura Strada B). **Prio 1 tra le feature di prodotto.**

**Obiettivo:** Live 100% indipendente dalla rete, dall'apertura al termine sessione. Caso d'uso: trainee in palestra senza rete esegue l'intero allenamento (anche un giorno saltato o futuro) senza errori bloccanti. Il server è sync in background, mai un requisito.

**Cosa fa (v1):**
- **UI legge/scrive sempre da IndexedDB**; Supabase = sync asincrono non bloccante. Regola cardine: nessuna azione utente aspetta la rete.
- **Preload cache Schede:** cachea l'albero intero (Scheda→Giorni→Blocchi→Esercizi) delle **ultime 2 schede** del trainee (LRU per `assigned_at`). Refresh non bloccante su apertura app (+ poll); versioning leggero via `assigned_at` (skip refetch se invariato). Cache-miss al primo accesso offline → messaggio esplicito ("serve una prima connessione…").
- **Sessione Live offline:** ogni mutation (serie/peso/reps/note/timer) scrive subito in IDB + UI; **coda di sync idempotente** con `client_mutation_id` (UUID) + idempotenza lato RPC; retry exponential backoff; flush su evento `online`. Timer/countdown/progresso client-side. Indicatore "offline · salvato localmente".
- **App shell offline:** nel nativo gli asset sono locali (bundle); **Service Worker/Workbox serve solo per il web/PWA** — da ridefinire nel design OFF1 (oggi non esiste, `public/` è vuota: si crea da zero).

**Decisioni prese:**
- Libreria IDB = **`idb`** (v8), non Dexie.
- Dopo la Fase 2 `POST /api/workouts` non esiste più → **idempotenza via RPC Postgres** (`client_mutation_id`), non nell'endpoint REST.
- **Persistenza storage su iOS:** il localStorage/IndexedDB della WebView può essere svuotato dal sistema quando manca spazio → affrontare esplicitamente nel design OFF1 (cosa è cache ricostruibile, cosa è coda non ancora sincronizzata e va protetta).

**Migration:** `ALTER TABLE schede ADD COLUMN assigned_at timestamptz NOT NULL DEFAULT now()` + backfill (`= data_inizio` se presente, altrimenti `now()`). **Verificare sul remoto dopo l'apply** (lezione q1_infra). Selezione cache: `… WHERE user_id=$1 ORDER BY assigned_at DESC LIMIT 2` (per `assigned_at`, non `data_inizio`, così una scheda futura non scavalca quella in corso).

**Non cachea:** storico `workouts` (già coperto dalla queue esistente) · media (non nello schema).

**Base già in codice (OFF1 estende, non parte da zero):** la Live persiste già `ActiveSession` in IndexedDB (`lib/liveStore` + `lib/idb`) e c'è già una **coda pending-workout con retry** (`enqueuePendingWorkout`, flush in `AppLayoutClient`). Novità OFF1: (a) preload cache schede, (b) coda idempotente con `client_mutation_id`, (c) indicatore stato, (d) app shell web.

**⚠ Flag:**
- **Poll di refresh (§3.5.2):** riusa "il poll del badge", introdotto da **MNGMT1** (dopo OFF1). In OFF1 il refresh parte da app-open (+ eventuale poll proprio); l'aggancio al poll badge arriva con MNGMT1.
- Migration `assigned_at`: additiva, applicare + verificare sul remoto.

**Tocca:** `liveStore`/`idb`, migration `schede`, RPC workouts. **Interagisce con:** MNGMT1 (poll badge, schede assegnate dal trainer) · R3 (refresh post-pubblicazione, opzionale).

---

### MNGMT1 — Ruoli (trainee/trainer/superadmin) + invio schede + Inbox + console admin
**Spec:** `SPEC_SUPERUSER_INBOX.md` (stato CONFERMATO — opzione B). DB verificato su prod (ref `lzwyhokkvzxlnubsenmf`); **nessuna migration applicata** (tutto SQL proposto — verificare lo stato remoto dopo ciascuna, lezione q1_infra). **In pausa fino all'app iOS minima; riparte subito dopo OFF1.** Prima di partire valutare un progetto Supabase di sviluppo separato (7 migration).

⚠ RLS, colonne user_id e policy di schede, giorni, esercizi, allenamenti e pesi sono state applicate a mano, fuori dalle migration: prima di creare un progetto di sviluppo o di partire con MNGMT1 serve una migration che le ricrei. (Verificato il 2026-10-14: `docs/superpowers/notes/ap1-storico-migration.md`.)

⚠ la regola SEC1 su exercise_id richiede exercises.user_id = utente: con la libreria globale (user_id NULL) va allargata a "user_id is null or …". (Migration `20261020213547_rls_riferimenti`, audit in `docs/superpowers/notes/rls-audit.md`.)

**Cosa fa (v1):**
- **Modello a 3 ruoli** su nuova tabella `profiles` (enum `trainee|trainer|superadmin`) + `trainer_id` (legame trainee→trainer) + `attivo` (soft-suspend) + `audit_log`. Helper `is_trainer()`/`is_superadmin()`; guard trigger sui campi sensibili; trigger `handle_new_user` (profilo su signup) + backfill.
- **Trainer → invio scheda:** upload PDF → parse (FIX6) → **preview editabile** → assegna a un *proprio* trainee → RPC `invia_scheda` (`SECURITY DEFINER`) crea l'albero di proprietà del trainee (`schede.stato='inviata'`) + notifica `pending` + riga audit.
- **Inbox trainee:** voce menu profilo + **badge** (poll on app-open/window-focus, conta non-lette) → lista notifiche ("martedì 7 luglio — Nuova scheda…") → **Accetta** (no rifiuto in v1) → `stato='accettata'`, scheda in archivio.
- **Console SuperAdmin:** promuovi/assegna/sospendi/riassegna trainer via RPC `admin_*`; audit log (solo superadmin legge).
- **Gancio libreria esercizi globale** (solo RLS ora): `exercises.user_id IS NULL` = globale, letta da tutti, scritta solo dal superadmin. UI futura (§8).

**Migrazioni proposte (7):** `profiles`+ruoli+helper+guard+trigger+backfill · `schede.stato` (default `'accettata'` → nessuna regressione, archivio filtra `accettata`) · `notifiche`+RLS (no insert policy) · `audit_log`+RLS · RPC `invia_scheda` (+gate scoping) · RPC `admin_*` · RLS libreria globale + policy `schede trainer read`. Poi: **nominare il superadmin (Fabrizio) a mano** post-migration.

**Decisioni confermate:** D1 badge solo poll · D2 no rifiuto in v1 · D3 badge = non-lette + marker "azione richiesta" · D4 opzione B (gestione trainer) · D5 libreria solo RLS ora.

**Interazioni col backlog:**
- ⚠ **RLS condivisa con AP1:** le policy cross-utente (trainer↔trainee, superadmin) si scrivono a partire dall'**audit RLS di AP1 Fase 2** (stesso documento di riferimento). Con il client diretto, SEC1 è parte di questo lavoro.
- **Sblocca l'Inbox** che R1 aveva omesso: `notifiche` è il backend messaggi.
- **Fondazione per R2 e INV1**: `profiles` (enum ruolo + `trainer_id`) è ciò che R2 (onboarding) e INV1 (referral_code) useranno (spec §8). Farlo prima evita retrofit.
- **Scioglie la tensione INV2**: notifica in-app via `notifiche` (poll) senza push.
- **Q1**: `notifiche.tipo` estendibile a `progressione`/`messaggio`. **R3**: indipendente (push aggancerà le insert su `notifiche`). **FIX6**: la preview usa il parser FIX6 — il parsing `import-pdf` sarà una Edge Function dopo AP1 Fase 2: la preview del trainer userà quella.

**⚠ Flag / da decidere prima:**
- **Scope ampio** → fasare: **P1** ruoli/`profiles`/RLS + Inbox/`notifiche` + `invia_scheda` + flusso trainer-invio + trainee-accetta · **P2** console SuperAdmin · **P3** libreria globale UI (§8, futuro).
- RPC `SECURITY DEFINER` bypassano le RLS: rivedere i gate interni con attenzione (già nel design).
- Trigger su `auth.users` da creare (oggi "nessun trigger auth").

**Dipende da:** FIX6 ✅ · R1 ✅ · **AP1 Fase 2 (audit RLS)** · OFF1 (ordine). **Abilita:** R2 · INV1 · INV2 (in-app) · Inbox · SEC1.

---

### R2 — Onboarding nuovi utenti
Flusso guidato: benvenuto → dati base → import scheda → consenso notifiche → `/home`. *(In pausa fino all'app iOS minima.)*

**Decisioni prese:** ✅ stato completamento su `user_metadata` Supabase · ✅ gating soft (banner, non blocco pagine).

**Decisioni aperte:**
- Cosa chiedere: livello esperienza, obiettivi, tipo di allenamento prevalente?
- Quanti step: 3-4 schermate o single-page form?
- Migration utenti esistenti: obbligatorio anche per chi c'era già?
- Distingue trainer da trainee già in fase di registrazione?
- **Auth da app:** conferma email e reset password si completano sul sito web (decisione AP1); verificare che il flusso di registrazione ridisegnato sia coerente.

**Dipende da:** R1 ✅ · G1 ✅ · MNGMT1 (`profiles`) · INV1 (coordinare flusso registrazione). Lo step "consenso notifiche" completo arriva con R3, ma **R2 può partire con gating soft**.

---

### INV1 — Invita un amico (core)
Dall'area profilo → `/invita`: genera link referral e lo condivide (WhatsApp / native share). L'invitato si registra tramite il link e viene tracciato in `referrals`. *(In pausa fino all'app iOS minima.)*

**⚠ Da risolvere prima:** la registrazione attuale è default Supabase Auth senza dati aggiuntivi. INV1 e R2 vanno progettati insieme — il codice `?ref=` va catturato nello stesso flusso di registrazione che R2 ridisegnerà. Fare INV1 prima di R2 = rifare l'integrazione.

**Flusso:** `A → /invita → /register?ref=CODICE_A → share`. `B` clicca → `localStorage.set('pendingRef', CODICE_A)` *prima* del redirect → registrazione → callback legge localStorage → INSERT `referrals` → pulisce. **⚠ `?ref=` sparisce nel redirect: salvarlo prima o si perde silenziosamente.** Con l'app nativa il link si apre sul **web** (decisione AP1 sull'auth): rivalutare un deep link (Universal Links) in questo task.

**Schema database:**
```sql
CREATE TABLE referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    UUID REFERENCES auth.users(id),
  invitee_id    UUID REFERENCES auth.users(id),
  invite_code   TEXT NOT NULL,
  invited_at    TIMESTAMPTZ DEFAULT now(),
  registered_at TIMESTAMPTZ,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'active'))
);
-- RLS: inviter vede solo le proprie righe · 'active' riservato a INV3
```

**Decisioni aperte:**
1. `referral_code`: `user_metadata` (A) o tabella `user_profiles` UNIQUE (B)? → *Raccomando B (serve anche a R1; con MNGMT1 diventa `profiles`)*
2. Formato codice: primi 8 char UUID (A) o leggibile `VITO-X7K2` (B)? → *Raccomando A*
3. Sharing: `navigator.share()` + fallback `wa.me` (A) o solo `wa.me` (B)? → *Raccomando A*
4. Testo WhatsApp pre-compilato: da scrivere.
5. Prevenzione self-referral: client + DB.
6. Duplicati: se B usa più codici, conta solo il primo.

**Dipende da:** R1 ✅ · R2 (coordinare flusso registrazione) · MNGMT1 (`profiles`) · Supabase Auth ✅.

---

### INV2 — Notifica "utente invitato registrato"
Trigger: `INSERT referrals` con `status='registered'` → Supabase Edge Function → push a invitante.

**⚠ Sequencing:** richiede infrastruttura **push** (AP1 passo 6, o web-push via R3). Anticipabile con notifica in-app (badge/inbox via MNGMT1) senza push, poi push con AP1.

**Dipende da:** INV1 · MNGMT1 (in-app) · push (**AP1** o R3).

---

### H1 — Attività "Altro" + barra settimanale multi-categoria
Registrare attività libere (non da scheda) e mostrarle nella barra settimanale con colore distinto. Visione 360° dell'attività fisica. *(In pausa fino all'app iOS minima. Dopo la Fase 2 le scritture passano da `supabase-js`/RPC, non da `/api/workouts`.)*

**Categorie iniziali (espandibili):** Libero · Padel · Nuoto · Corsa/Camminata.

**Flusso:** Home → [+ Aggiungi attività] → categoria "Altro" → tipo → durata (obbligatoria) → `workouts` con `category='altro'` → barra aggiornata con segmento colorato.

**Data model — migration additiva (solo futuri):**
```sql
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'scheda'
    CHECK (category IN ('scheda', 'altro')),
  ADD COLUMN IF NOT EXISTS activity_type TEXT; -- 'libero'|'padel'|'nuoto'|'corsa_camminata', NULL per scheda
```
Nessuna retroattività: workout con `category = NULL` trattati come 'scheda' lato client.

**Decisioni aperte:**
1. UI selezione: bottom sheet mobile (consigliato) o dropdown?
2. "Libero": palestra senza scheda? Non confondere con Live senza scheda.
3. Metriche: corsa/nuoto → distanza (km)? Solo durata per MVP?
4. Colore barra "Altro": token disponibili post-G1.
5. Barra: segmenti come % o conteggio assoluto?
6. "Altro" avviabile da Live (con timer) o solo registrazione manuale?
7. Workout "Altro" inclusi in calendario e analytics Q1?

**Dipende da:** Home ✅ · barra settimanale ✅ · G1 ✅ · Q1 (se inclusi nei KPI).

---

## 🟠 Priorità secondaria

*(AP1 è stata promossa a percorso critico il 2026-10-13: vedi sezione dedicata sopra. Questa sezione è vuota.)*

---

## ⚪ Priorità bassa — a valle di AP1

> Nota: **F10 · Q1** sono web-side e non dipendono tecnicamente da AP1 (deprioritizzate per scelta). **F7 · R3** dipendono da AP1 (passo 6). **SEC1** è assorbita in AP1 Fase 2.

### F10 — Countdown: timer di lavoro per esercizi a tempo
Timer di *lavoro* (conta alla rovescia la durata) per isometrici, tabata, plank, HIIT. Complementa il timer di recupero FIX5.

**Flusso:** `[esercizio a tempo]` → GET READY 10s → countdown durata (da scheda, ±10") → fine → timer recupero → serie successiva. Durata da `duration_seconds` su `esercizi` (pattern `rest_seconds`); se null → input manuale.

**Decisioni aperte:** migration `duration_seconds` + `tipo:'reps'|'time'` su `esercizi` · GET READY fisso vs da Preferenze · colore dedicato · haptics (AP1) · PDF importer auto-popola durata. **Dipende da:** FIX5 ✅ · Q1-infra ✅ · FIX6 ✅.

---

### R3 — Notifiche PWA / push
Push reminder allenamenti, streak, motivazione.

**Vincolo critico:** Capacitor iOS e web push sono architetture diverse — il path si sceglie nel passo 6 di AP1 (push nativo; OneSignal raccomandato). **Decisioni aperte:** web push (SW) / Capacitor / entrambi · backend (Vercel fn / Edge Function / OneSignal) · tipi notifica · frequency cap. **Dipende da:** AP1 (app iOS minima + setup APNs/FCM).

---

### Q1 — Progressioni + messaggi incoraggiamento
Data layer Q1-infra ✅. Dati scritti nel formato corretto da F6 in poi. Workout pre-2026-05-28 senza `exercise_results` → esclusi dalle analytics cross-scheda.

**KPI definiti:**

| KPI | Formula | Sorgente |
|---|---|---|
| Trend carico | `avg(load)` per `exerciseId` / settimana | tutte |
| PR personale | `max(load)` per `exerciseId`, storico | tutte |
| Trend reps | `repsActual / repsPlanned %` | tutte |
| Completion rate serie | `setsCompleted / setsPlanned %` | tutte |
| Stallo | `Δload = 0` per ≥ 3 settimane | tutte |
| Recupero anomalo | `restActual − restPlanned` media | solo live |
| Frequenza | `count(workouts)` / settimana | tutte |
| Streak | settimane consecutive con obiettivo | tutte |
| Durata per tipo | `avg(duration)` per `schedaGiorno` | tutte |

**Nota (2026-10-13):** nel KPI **Frequenza** includere la statistica **«media allenamenti/settimana»**, presente nella vecchia versione (branch `claude/gallant-cannon`) e mai arrivata nella versione Next.

**Messaggi trigger:** PR battuto · carico aumentato · stallo · streak · frequenza in calo · recupero anomalo.
**Decisioni aperte:** contenitore messaggi (banner home / push R3 / sezione `/progressioni`) · workout "Altro" (H1) nei KPI? · RPE fase 2 · come entrano i `rounds[]` AMRAP (FIX6) nei KPI · **generazione messaggi motivazionali:** la route `motivation` è stata eliminata (resta nella storia git) → se serve AI, nuova Edge Function. _Web-side: non richiede AP1._

---

### SEC1 — Vincolo cross-user su FK exercises *(assorbita in AP1 Fase 2)*
FK `esercizi.exercise_id → exercises(id)` non verifica ownership. RLS copre la lettura, ma a livello DB un `exercise_id` potrebbe puntare a una riga di un altro user (la logica app oggi non lo fa).

**Stato (aggiornato 2026-10-13):** non più dormiente. Con il client che parla direttamente con Supabase (AP1 Fase 2) e con le letture cross-utente di MNGMT1, la revisione di questo vincolo entra nell'**audit RLS di AP1 Fase 2**, non resta voce separata a bassa priorità. **Fix:** RLS più stretta sull'insert / vincolo composto / validazione ownership.

---

### INV3 — Rewards invitante/invitato *(futuro — meccanica da definire)*
Direzioni: mesi premium / sblocco feature / badge. Prerequisito: `referrals.status='active'` (invitato ha usato l'app per X sessioni). Nessuna decisione presa. Dipende da INV1/INV2.

---

### F7 — VoiceRecorder *(sbloccato da AP1, passo 6)*
Box "Note vocali" nella Summary. Web Speech API → `workouts.voice_note_transcript`.
**Deprioritizzato (2026-06-21):** WKWebView/Capacitor iOS non supporta Web Speech API → ha senso solo **dopo AP1** (dettatura nativa). La textarea della Summary copre intanto le note.
**Decisioni aperte:** fallback UI · lingua `it-IT` hardcoded (raccomandato) vs setting · permission flow. **Dipende da:** F6 ✅ · **AP1**.

---

# ✅ COMPLETATI

| ID | Nome | Data | Commit |
|---|---|---|---|
| F0–F3 | Live: base, esercizi, serie, timer | — | commitato |
| F4 | Live: completamento esercizio | 2026-05-28 | `14fb41b` |
| F5 | Live: timer recupero v1 | — | 🟡 superseded da FIX5 |
| F9 | Live: EMOM Rocker | — | commitato |
| Q1-infra | Data model exercise results (JSONB) | 2026-05-28 | migration prod · spec `SPEC_FIX5_Q1infra_F6.md` |
| FIX5 | Timer recupero — revisione completa | 2026-05-29 | `13edf15` |
| F6 | Summary screen | 2026-05-29 | `13edf15` |
| R4 | Riordino esercizi (ReorderModal) | 2026-06-21 | `693e972` |
| FIX5b | Recupero countdown/stopwatch | 2026-06-21 | `2589a96` |
| F8 | Polish + a11y + edge cases Live | 2026-06-21 | `6647449` |
| FIX6 | Blocchi circuito AMRAP (Fase 1+2) | 2026-06-23 | `d9d60f0`+`0edcb10` |
| R1 | Profilo + Preferenze | 2026-07-06 | `b944a36` |
| G1 | Redesign mobile (token + tab bar + 3 schermate) | 2026-07-06 | `f5fe143`…`dab0a3e` |
| AP1 Fase 0 | Setup, inventario, spike export | — | note in `docs/superpowers/notes/` |

Dettaglio decisioni prese (per riferimento futuro):

<details>
<summary><b>FIX5b</b> — modalità recupero countdown/stopwatch</summary>

Parser ritorna `{ seconds: number | null, mode: 'countdown' | 'stopwatch' }`; `SessionExercise` prende `restMode`. Le 5 varianti collassano a **2 comportamenti**.

| Variante `recupero` | mode | seconds |
|---|---|---|
| `60`, `90`, `1'` | countdown | n |
| `60"/90"` (range) | countdown | min (60) |
| `Resto del minuto` | countdown | 60 (fallback numerico) |
| `Completo` | **stopwatch** | null (count-up, termina con "Start Next") |
| `//`, vuoto | countdown | 90 (`DEFAULT_REST_SECONDS`) |

`Completo`: `restActual` = elapsed reale, `restPlanned` = null (escluso dal KPI recupero anomalo). _Futuro:_ con F10 il "Resto del minuto" si può raffinare a `60 − durata serie`.
</details>

<details>
<summary><b>FIX6</b> — blocchi circuito AMRAP (Fase 1+2)</summary>

Entità **Blocco** tra Tipo (giorno) ed Esercizio. Storage relazionale: tabella `blocchi` (figlia di `tipi`) + `esercizi.blocco_id` nullable (null = singolo). Migration `20260621_fix6_blocchi` applicata in prod.
- **Fase 1:** parser PDF raggruppa i circuiti in blocchi; GET/duplica assemblano; Schede mostra una card per blocco; una tab per giorno (conteggio TOTEX).
- **Fase 2:** Live a **segmenti** (esercizio | blocco AMRAP); pagina `AmrapBlock` (countdown durata, contatore "Giro completato", log reps/carico inline per giro); payload con `rounds[]` in `exercise_results`; summary card "Giri".
- **Fuori scope / rinviato:** `circuito_giri` (giri fissi) solo salvato grezzo + fallback sequenziale in Live. Fix minori rinviate a dopo test approfondito. Dettaglio: `docs/changes230626.md`.
</details>

<details>
<summary><b>F8</b> — polish, a11y ed edge case Live</summary>

- Sessione stale >24h → ConfirmModal "Riprendi/Scarta" all'hydrate (no delete silenzioso).
- Collisione: "Inizia" con sessione in corso → ConfirmModal prima di sovrascrivere (era overwrite silenzioso = perdita dati).
- aria-live "serie N completata/annullata"; `prefers-reduced-motion` globale.
- Notification API locale a fine recupero in background (push completo → R3).
- `@capacitor/haptics` rinviato (resta `navigator.vibrate`).
</details>

<details>
<summary><b>R4</b> — riordino esercizi (ex drag&drop)</summary>

Drag HTML5 non funzionava su iOS touch → sostituito con `ReorderModal` generico (frecce su/giù). Solo esercizi dentro un tipo; drag desktop rimosso; un solo `PUT /reorder` alla conferma; trigger ↕ nell'header del tipo. A11y: su/giù disabilitati agli estremi.
</details>

<details>
<summary><b>R1</b> — Profilo + Preferenze</summary>

`/profilo` (route dedicata): card identità (email/iniziali reali), Preferenze, Logout (migrato da `GtTopStrip` rimosso). **Inbox omessa** (nessun backend messaggi). `/profilo/preferenze` (base): default recupero (wired in `liveStore`), unità kg/lbs, lingua — su `localStorage` (`lib/prefs.ts`). **Rinviato:** avatar/PR profilo, tema toggle, Inbox, i18n/conversione unità reale.
</details>

<details>
<summary><b>G1</b> — redesign mobile (design handoff <code>newVisual.zip</code>)</summary>

**Fase A (fondamenta):** token `--gt-*` allineati (`f5fe143`); tab bar 5 slot floating con Live come tab, rimossi `GtTopStrip`/`GtLiveFab` (`0bbede2`); sfondo app light `--gt-bg` (`41ba4ee`).
**Fase B (re-skin):** Home hero + bottom sheet + `WorkoutCard` condiviso (`371e808`); Agenda segmented + hero stats + strip giorni (`424314a`); Schede archivio cover monocroma + card + popover ⋯ (`dab0a3e`). Cleanup classi `.gt-*` legacy (`74e9d75`).
**Rinviato:** `/schede` "attuale" non re-skinnata (resta dark); Agenda Mese/Anno invariati; colore "Altro" (H1) da coordinare.
</details>

---

*Ultimo aggiornamento: 2026-10-13 — AP1 promossa a percorso critico; nuovo ordine (igiene → Fase 2 → Fase 1 → app iOS minima → OFF1 → push/haptics/dettatura → TestFlight/Android); decisioni AP1 del 13/10 registrate; MNGMT1/R2/INV1/INV2/H1 in pausa; SEC1 assorbita nell'audit RLS di Fase 2.*
