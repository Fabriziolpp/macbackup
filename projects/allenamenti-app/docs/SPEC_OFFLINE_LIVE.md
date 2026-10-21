# SPEC_OFFLINE_LIVE.md

**Progetto:** Vi.To (ex allenamenti-app)
**Feature:** Modalità Live offline-first + preload proattivo delle Schede
**Stato:** Draft per implementazione — Claude Code
**Dipendenze:** nessuna bloccante. Il trigger "refresh cache dopo pubblicazione scheda" è opzionale in v1 e può essere rifinito quando R3 (web-push vs Capacitor) sarà deciso.

---

## 1. Obiettivo

Rendere la modalità Live (esecuzione allenamento da parte del trainee) completamente indipendente dalla connessione di rete, dal momento in cui l'app viene aperta fino al termine della sessione. Il server è un layer di sync in background, mai un requisito per procedere.

Caso d'uso guida: il trainee entra in palestra (rete assente o instabile), apre l'app, e deve poter eseguire l'intero allenamento — anche se non è quello "di oggi" — senza mai vedere un errore bloccante legato alla rete.

---

## 2. Architettura generale

```
┌─────────────────────────────────────────┐
│              UI (React)                  │
│  legge/scrive SEMPRE da IndexedDB        │
└──────────────┬────────────────────────────┘
               │
       ┌───────▼────────┐
       │   Dexie/IDB      │  ← source of truth locale
       │  - schede cache  │
       │  - session queue │
       └───────┬────────┘
               │ sync asincrono, non bloccante
       ┌───────▼────────┐
       │   Supabase       │  ← backup/persistenza remota
       │  (RPC + Postgres)│
       └──────────────────┘
```

Regola cardine: **nessuna azione utente aspetta una risposta di rete**. Scrittura locale → UI aggiornata → sync in background.

---

## 3. Cache delle Schede (preload proattivo)

### 3.1 Unità di cache: Scheda intera

Si cachea l'intero albero, non il singolo Giorno:

```
Scheda (schede)
 └─ Giorno[] (tipi)
     └─ Blocco[] (blocchi)
         └─ Esercizio[] (esercizi, con eventuale join su exercises)
```

Non esiste fetch/cache selettivo per singolo giorno: è tutto o niente per ogni scheda. Questo copre il caso in cui il trainee voglia recuperare un giorno saltato o guardare avanti nella settimana anche offline.

### 3.2 Migration richiesta: `assigned_at`

Verificato via ispezione schema live (progetto `lzwyhokkvzxlnubsenmf`) che la tabella `schede` **non ha** un campo di assegnazione: possiede solo `data_inizio` (date, semantica di "inizio piano", non di "quando è stata assegnata") e nessun `created_at`.

```sql
ALTER TABLE public.schede
  ADD COLUMN assigned_at timestamptz NOT NULL DEFAULT now();
```

- Backfill per le righe esistenti (4 righe oggi): `assigned_at = data_inizio` se disponibile, altrimenti `now()` al momento della migration.
- Nessun default diverso richiesto: nuove schede prendono `now()` automaticamente alla creazione.
- **Da verificare contro DB remoto dopo l'apply** (principio stabilito nell'incidente q1_infra: mai assumere che una migration locale sia stata applicata al remoto — controllare con `list_tables` o query diretta post-apply).

### 3.3 Selezione delle "ultime 2 schede"

Query per determinare quali schede cachare per un dato trainee:

```sql
SELECT id, nome, mese, data_inizio, weeks, assigned_at
FROM schede
WHERE user_id = $1
ORDER BY assigned_at DESC
LIMIT 2;
```

Ordinamento per `assigned_at`, non per `data_inizio` — evita che una scheda con data di inizio futura (pianificata in anticipo dal trainer) scavalchi la scheda attualmente in corso.

### 3.4 Rotazione della cache

- Quando arriva una terza scheda assegnata, la più vecchia delle 2 presenti in Dexie viene rimossa.
- Logica: LRU semplice basata su `assigned_at`, nessuna euristica aggiuntiva necessaria in v1.
- La rotazione avviene lato client al momento del refresh cache (vedi §3.5), non richiede logica server-side dedicata.

### 3.5 Trigger di refresh cache

Il refresh (fetch delle ultime 2 schede + upsert in Dexie) avviene, solo se online:

1. All'apertura dell'app.
2. Su poll periodico leggero già esistente nell'architettura (badge updates via poll — riuso dello stesso meccanismo, nessun nuovo canale di rete introdotto).
3. (Opzionale, post-R3) dopo che il trainer pubblica/modifica una scheda — oggi copribile dal poll di cui al punto 2, in attesa della decisione su web-push/Capacitor.

Il refresh non è mai bloccante: se fallisce (rete assente), si resta silenziosamente sulla cache esistente, nessun errore mostrato all'utente.

### 3.6 Versioning leggero

Ogni scheda cachata in Dexie porta il campo `assigned_at` (già presente) usato anche come versione:

- Al refresh, si confronta `assigned_at` locale vs remoto per lo stesso `id` di scheda.
- Se identico → nessuna riscrittura, si evita traffico dati inutile.
- Se diverso o scheda non presente in cache → fetch completo dell'albero (Giorni/Blocchi/Esercizi) e upsert in Dexie.

### 3.7 Cosa NON viene cachato in questa fase

- Storico esecuzioni (`workouts`, log delle sessioni già completate): resta fuori da questo meccanismo, non serve offline per l'esecuzione di una nuova sessione.
- Media (video/immagini dimostrative negli esercizi): oggi non presenti nello schema (`esercizi` non ha campi media). Se introdotti in futuro, restare solo come URL, nessuna cache blob in v1 — da rivalutare quando il caso d'uso esiste davvero.

### 3.8 Fallback cache miss

Se il trainee è offline e non esiste nessuna scheda cachata (primo accesso mai avvenuto online): messaggio esplicito e onesto, non un errore generico —

> "Serve una prima connessione per scaricare il tuo programma di allenamento."

Nessun tentativo di retry automatico invisibile in questo stato: l'utente deve capire chiaramente che serve rete almeno una volta.

---

## 4. Sessione Live offline

### 4.1 Scrittura locale immediata

Ogni mutation della sessione live (serie completata, peso, reps, note, rest timer avviato/terminato) scrive subito in IndexedDB e aggiorna la UI. Nessuna mutation aspetta risposta da Supabase.

### 4.2 Coda di sync idempotente

- Ogni mutation in coda porta un `client_mutation_id` (UUID v4) generato al momento della scrittura locale.
- Le RPC lato Supabase devono trattare questo ID come chiave di idempotenza: se una mutation con lo stesso `client_mutation_id` arriva due volte (es. per un retry dopo connessione instabile), la seconda è un no-op.
- Retry con exponential backoff; flush automatico della coda sull'evento `online` del browser.

### 4.3 Timer e logica di sessione

Rest timer, countdown, calcoli di progresso: tutto client-side, zero dipendenza di rete. L'unica sync è a livello di "checkpoint" (fine serie, fine sessione) — mai in-the-loop con il timer stesso.

### 4.4 Feedback di stato

Indicatore leggero e non invasivo nella UI di sessione live, del tipo:

> "Offline · salvato localmente, sincronizza quando torna la rete"

Evita che l'utente pensi che i dati siano persi o che debba rifare qualcosa.

### 4.5 Service Worker / App shell

Verificare la strategia Workbox esistente per il caching degli asset statici: la sessione live deve poter *aprirsi* offline, non solo salvare dati offline. Cache asset (Workbox) e cache dati (Dexie) vanno tenute allineate concettualmente, ma sono meccanismi indipendenti — non serve un'unica invalidazione condivisa in v1.

---

## 5. Fuori scope per questa spec

- Notifiche push legate al refresh cache (dipende da R3, non bloccante per questa implementazione).
- Cache di media/video negli esercizi (nessun caso d'uso reale oggi).
- Storico esecuzioni offline (già coperto da meccanismo di queue esistente per i salvataggi, non da questo preload).

---

## 6. Checklist di implementazione per Claude Code

- [ ] Migration: `ALTER TABLE schede ADD COLUMN assigned_at timestamptz NOT NULL DEFAULT now();` + backfill
- [ ] Verifica migration applicata su DB remoto (query diretta post-apply, non fidarsi del solo log locale)
- [ ] Query/RPC: selezione ultime 2 schede per `user_id` ordinate per `assigned_at DESC LIMIT 2`
- [ ] Dexie: schema tabelle locali per Scheda → Giorno → Blocco → Esercizio (struttura ad albero)
- [ ] Logica di refresh cache: trigger su apertura app + poll esistente, non bloccante
- [ ] Logica di rotazione: elimina la scheda cachata più vecchia quando se ne aggiunge una terza
- [ ] Confronto versioning (`assigned_at`) per evitare refetch inutili
- [ ] UI: messaggio di cache-miss per primo accesso offline
- [ ] Coda di sync sessione live: mutation con `client_mutation_id` (UUID), idempotenza lato RPC
- [ ] Retry con exponential backoff + flush su evento `online`
- [ ] Indicatore di stato offline/sync nella UI di sessione live
- [ ] Verifica strategia Workbox per apertura app offline (app shell)
