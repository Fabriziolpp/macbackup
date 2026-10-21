# AP1 — Igiene e Fase 2 (livello dati diretto): design

> **Data:** 2026-10-13 · **Stato:** design approvato in chat il 2026-10-13; documento in revisione.
> **Fonte di verità** per priorità e stato: `docs/BACKLOG.md` (sezione AP1).
> **Spec madre:** `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md`.
> **Esiti Fase 0:** `docs/superpowers/notes/ap1-fase0-{inventory,export-spike,findings}.md`.

## 1. Obiettivo e perimetro

Al termine di questo lavoro:
- il client parla direttamente con Supabase attraverso un livello dati tipizzato, e la RLS fa da guardia;
- `app/api` è vuota:
  - le 12 route CRUD sono sostituite dal livello dati;
  - `import-pdf` gira su una Edge Function;
  - `config`, `config/key` e `motivation` sono eliminate.

  Le «14 route» del BACKLOG sono le 12 CRUD più `config` e `config/key`, che sono morte;
- repo, dipendenze e storico migration sono in ordine;
- la Fase 1 (export statico) può partire.

**Dentro:** igiene (push P0) e Fase 2 (push P1–P4). **Fuori:** vedi §12.

Il web resta Next con server finché l'export non è validato (Fase 1). Ogni passo è retrocompatibile e va in produzione da solo.

## 2. Decisioni di riferimento (2026-10-13)

| Tema | Decisione |
|---|---|
| Ordine | igiene → Fase 2 → Fase 1 → app iOS minima → OFF1 → push/haptics/dettatura → TestFlight/Android |
| Rilascio | Fase 2 a piccoli passi su `main`; ogni push va in produzione (Vercel) |
| Livello dati | un modulo tipizzato per risorsa in `lib/data/` (approccio A, §5.1) |
| Duplica | RPC Postgres atomica. Copia tutti i campi degli esercizi e i blocchi, rimappando `blocco_id`. `data_inizio` e `weeks` restano vuoti |
| Route morte | `motivation`, `config` e `config/key` eliminate subito, in P0. Nessun chiamante; `motivation` non compare neanche in `ios/` |
| `import-pdf` | Edge Function con JWT obbligatorio e limite per utente: 10 import ogni 24 ore, in una costante unica. Chiave dedicata `ANTHROPIC_API_KEY_EDGE`, impostata da Fabrizio. Prima si fa uno spike |
| Modello AI | `claude-sonnet-4-6`, come oggi. Lo spike lo confronta col Sonnet più recente su tempi, costo e qualità; decide Fabrizio |
| RLS | audit prima di spegnere la prima route. Le policy si correggono prima di P1; migration e conteggi si mostrano a Fabrizio prima di applicarli |
| Test | Vitest per le funzioni pure, `test:rls` con due utenti di test, `test:db` con i test funzionali e di parità (questi ultimi temporanei) |
| Produzione | l'unico progetto Supabase è la produzione: niente operazioni distruttive, mai la service role nei test |
| Sessione nativa | `@capacitor/preferences` con un adapter in `lib/supabase.ts` (Fase 4). Il Keychain si rivaluta prima di MNGMT1 |
| Esecuzione | la prima risorsa (workouts) si migra in sessione, poi si passa ai subagent in parallelo |

Le decisioni sulle fasi successive (bundle ID, Android, auth via web…) sono nel BACKLOG.

## 3. Regole di rilascio e sicurezza

### 3.1 Ogni push è un rilascio
- Si committa su `main` in locale. Il push pubblica in produzione, perché il deploy Vercel parte da solo.
- I push sono cinque:
  - **P0**: igiene;
  - **P1**: workouts;
  - **P2**: schede, duplica e weight-logs;
  - **P3**: import-pdf;
  - **P4**: pulizia finale.
- Prima di ogni push si passa dal cancello del §10.5.
- Se il push pubblica commit rimasti solo in locale, prima si mostra `git show --stat` e si aspetta l'ok di Fabrizio. Per `dcf9907` l'ok c'è già (2026-10-13).

### 3.2 Database di produzione
- **Solo in sessione, mai dai subagent:** migration, deploy della Edge Function e ogni altra operazione su produzione. I subagent scrivono codice, SQL e test.
- **Migration additive** di questo design (`duplica_scheda`, `ai_usage`): le applico io al merge del task.
- **Migration che cambiano policy o toccano dati esistenti** (la correzione RLS del §7): prima mostro a Fabrizio SQL e conteggi, poi applico dopo il suo ok.
- **Dati reali:** niente DROP, DELETE o UPDATE. I test cancellano solo le proprie fixture (§10.2).
- La service role key non entra mai nei test né nel client.

### 3.3 Segreti
- Le chiavi API le imposta Fabrizio, in `.env.local` e nei secret Supabase dal dashboard. Non leggo né stampo i loro valori.
- Il token GitHub è fine-grained, limitato a questo repo e con scadenza. Si inserisce solo nel prompt di `git push`, che lo salva nel portachiavi di macOS: mai nell'URL del remote, mai in chat.

## 4. Igiene (P0)

### 4.1 Documenti — fatto il 2026-10-13
- `9947a76`: il BACKLOG di Fabrizio, committato così com'è.
- `06276de`:
  - le note di Fase 0 su `main`, senza il `next.config` dell'export;
  - spec, piano e prompt AP1 in `docs/superpowers/`;
  - le copie doppie eliminate.
- Il `.docx` e `STACK_MOBILE_analisi_locale.md` restano solo in locale, esclusi tramite `.git/info/exclude`.
- Rami locali eliminati (su `origin` esiste solo `main`):

  | Ramo | Commit |
  |---|---|
  | `ap1/fase0-spike` | `ce7deaf` |
  | `handoff-backup` | `c0de2fe` |
  | `claude/gallant-cannon` | `6454f6d` |
  | `claude/inspiring-franklin` | `b99aaf5` |
  | `claude/vigorous-thompson` | `b99aaf5` |

### 4.2 Git e credenziali
- Si tolgono le credenziali dall'URL di `origin`, che diventa `https://github.com/Fabriziolpp/allenamenti-app.git`. L'helper `osxkeychain` è già attivo, configurato dal gitconfig di Xcode.
- Il primo push lo fa Fabrizio con `! git push`, inserendo un token fine-grained nuovo. Da lì il portachiavi lo ricorda.

### 4.3 Codice legacy e tsconfig
- Si eliminano `server.js`, `supabaseClient.js` e `migrate-data.js`.
- Si eliminano le route morte `app/api/motivation`, `app/api/config` e `app/api/config/key`, che non hanno chiamanti. La GET di `config` espone gli ultimi 6 caratteri della chiave Anthropic. In `DESIGN.md` si aggiorna la voce `/api/motivation`.
- Da `package.json` si tolgono `"main"`, `start:express`, `express`, `multer`, `dotenv` e `@types/pdf-parse`. `@anthropic-ai/sdk` resta fino a P4.
- Da `tsconfig.json` si esclude `docs/`. Contiene il prototipo `docs/design/home-codebase/page.tsx`, che usa `apiFetch` e romperebbe il build quando lo togliamo.
- I file locali non versionati (`data.json`, `backups/`, `config.json`) non si toccano.

### 4.4 Aggiornamenti di sicurezza
- **Next**: da 16.2.2 a **16.3.8**, la prima versione con le correzioni, uscita il 2026-09-30. La 16.4.0, una nuova minor del 2026-10-06, si rimanda.
- **Capacitor**: `@capacitor/core`, `cli` e `ios` da 8.3.1 a **8.5.2**, che chiude GHSA-rvm3-566m-v7fv (uscita il 2026-09-11). Il progetto iOS (pacchetto SPM) si allinea con la CLI di Capacitor.
- `npm audit fix` senza `--force`. Le vulnerabilità che restano si elencano nel messaggio di commit.

### 4.5 Storico migration
1. Si esegue `list_migrations` e l'output va in `docs/superpowers/notes/ap1-storico-migration.md`, sezione «prima».
2. Si rinominano `20260528000000_q1_infra.sql` in `20260612094108_q1_infra.sql` e `20260621000000_fix6_blocchi.sql` in `20260621203459_fix6_blocchi.sql`.
3. Si aggiunge in locale il file di `create_tables`, con la versione remota, ricavato dagli statement conservati nello storico remoto. Se lo storico non li ha, il file contiene solo un commento che lo spiega.
4. Si registra `20260429000000_live_mode` nello storico remoto, con una INSERT in `supabase_migrations.schema_migrations`. Lo schema non cambia: le colonne esistono già.
5. Si esegue di nuovo `list_migrations` e l'output va nella sezione «dopo». Locale e remoto devono coincidere.

**Convenzione da qui in avanti:**
1. scrivo il file SQL;
2. lo applico con `apply_migration`;
3. leggo la versione assegnata con `list_migrations`;
4. rinomino il file locale con quella versione;
5. rigenero i tipi DB (§5.2);
6. committo.

### 4.6 Azioni di Fabrizio
- **Leaked password protection**: si attiva dal dashboard Auth; la disponibilità può dipendere dal piano.
- **Utenti di test**:
  - due utenti creati dal dashboard (Authentication → Add user, con «Auto Confirm User»);
  - credenziali in `.env.local` (`TEST_USER_EMAIL`/`TEST_USER_PASSWORD`, `TEST_USER_2_EMAIL`/`TEST_USER_2_PASSWORD`);
  - una scheda sull'utente 1.
- **Prima dello spike di import-pdf**:
  - il secret `ANTHROPIC_API_KEY_EDGE`;
  - un limite di spesa sulla console Anthropic;
  - 1–2 PDF reali, compreso il più pesante.
- **A fine P4**: rimuovere `ANTHROPIC_API_KEY` da Vercel e revocare la vecchia chiave.

### 4.7 Cancello P0
Si passa dal cancello del §10.5, senza `test:db`, che non esiste ancora. Poi `git show --stat` dei commit da pubblicare, e il push lo fa Fabrizio.

## 5. Fase 2 — architettura del livello dati

### 5.1 Approccio
La scelta è **A, un modulo tipizzato per risorsa**: ogni route diventa una funzione con la stessa logica, e i componenti la chiamano direttamente.

Approcci scartati:
- **B, uno shim di `apiFetch`**, cioè un router nel browser che intercetta `/api/...`. I call site non cambierebbero, ma resterebbero percorsi come stringhe e risposte HTTP simulate: un debito da smontare dopo. In più OFF1 dovrebbe interpretare URL.
- **C, cioè A più una libreria di cache (TanStack Query).** Cambia il modello di stato di `AppProvider` e si sovrappone alla cache `idb` di OFF1.

### 5.2 Moduli
```
lib/data/
  types.ts        tipi di dominio (Scheda, Tipo, Blocco, Esercizio, Workout, WeightLog) + tipoEsercizi()
  db.types.ts     tipi generati dallo schema Supabase (generate_typescript_types, sola lettura)
  errors.ts       DataError e conversione dagli errori di supabase-js
  session.ts      requireUserId(db): id utente dalla sessione locale; DataError('auth') se assente
  workouts.ts     mapping puri (shapeWorkout, toWorkoutRow) + API
  schede.ts       mapping puri (albero FIX6, shapeEsercizio, toEsercizioRow) + API
  weightLogs.ts   mapping puri (esNome ↔ es_nome) + API
  importPdf.ts    chiamata alla Edge Function
  index.ts        createDataApi(db) e l'istanza `data` legata al client del browser
```
- **Tipi**: i tipi di dominio passano da `providers/AppProvider.tsx` a `lib/data/types.ts`. `AppProvider` li riesporta, quindi nessun import esistente cambia.
- **Un file per risorsa**: contiene mapping e API, con il file di test accanto. Così i task paralleli non toccano gli stessi file.
- **Client passato dall'esterno**: le funzioni lo ricevono tramite `createDataApi(db)`. L'app usa quello del browser, i test quello degli utenti di test.

### 5.3 Interfaccia
```ts
type SchedaMeta = Omit<Scheda, 'tipi'>;

interface DataApi {
  workouts: {
    list(): Promise<Workout[]>;
    create(input: WorkoutInput, opts?: { id?: string }): Promise<Workout>;
    update(id: string, input: WorkoutInput): Promise<Workout>;
    remove(id: string): Promise<void>;
  };
  weightLogs: {
    list(): Promise<WeightLog[]>;
    create(input: WeightLogInput, opts?: { id?: string }): Promise<WeightLog>;
    remove(id: string): Promise<void>;
  };
  schede: {
    list(): Promise<Scheda[]>;
    create(input: SchedaInput, opts?: { id?: string }): Promise<Scheda>;
    update(id: string, input: SchedaInput): Promise<SchedaMeta>;
    remove(id: string): Promise<void>;
    duplica(srcId: string, input: { nome: string; mese: string }): Promise<string>; // id della copia
    createTipo(schedaId: string, nome: string): Promise<Tipo>;
    updateTipo(schedaId: string, tipoId: string, nome: string): Promise<void>;
    removeTipo(tipoId: string): Promise<void>;
    createEsercizio(tipoId: string, input: EsercizioInput): Promise<Esercizio>;
    updateEsercizio(esId: string, input: EsercizioInput): Promise<Esercizio>;
    removeEsercizio(esId: string): Promise<void>;
    reorderEsercizi(orderedIds: string[]): Promise<void>;
  };
  importPdf(file: File, opts?: { signal?: AbortSignal }): Promise<ImportPdfResult>;
}
```
- Gli input (`WorkoutInput`, `SchedaInput`, `EsercizioInput`, `WeightLogInput`) hanno gli stessi campi dei body di oggi.
- Le funzioni restituiscono la stessa forma della route. Fanno eccezione i casi in cui la route restituisce una riga grezza che la UI ignora (`updateTipo`): lì la funzione restituisce `void`, e la parità si verifica sullo stato del DB.

### 5.4 Comportamento: parità con le route
Ogni funzione replica la route corrispondente:
- **stessi default**: `''`, `0`, `null`;
- **stesse normalizzazioni**: `durata` intero, `source` vale `live` o `manual`, i campi opzionali si scrivono solo se presenti;
- **stessi ordinamenti**: schede per id decrescente; tipi, blocchi ed esercizi per `ordine`; workouts per `data`; weight_logs per `date`;
- **stessa lettura dell'albero**: `select('*, tipi(*, esercizi(*), blocchi(*))')`.

Altre regole:
- **`user_id`**: si imposta dalla sessione su ogni insert, perché la colonna non ha default.
- **Id**: si generano lato client con `newId()`. `create` accetta anche un id esterno, che servirà a OFF1 per l'idempotenza.
- **`ordine` di `createTipo` e `createEsercizio`**: il massimo esistente più 1, come oggi.
- **`reorderEsercizi`**: N update in parallelo, come oggi. Non è atomico; renderlo una RPC è fuori perimetro.
- **Delete di una riga non propria o inesistente**: nessun errore, come oggi, perché la RLS la rende invisibile.
- **Update di una riga non propria o inesistente**: `DataError('not_found')`, dove oggi la route risponde 404.
- **Duplica**: non ha parità con la route. Corregge di proposito i campi che oggi si perdono (§8).

### 5.5 Errori
`DataError { kind, message, cause }`, dove `kind` vale:

| kind | Quando |
|---|---|
| `auth` | nessuna sessione; 401 dalla Edge Function |
| `forbidden` | violazione RLS (`42501`) |
| `not_found` | `PGRST116` (update o single senza righe), `P0002` (RPC) |
| `conflict` | chiave duplicata (`23505`) |
| `invalid` | input rifiutato: 400, 413 o 422 dalla Edge Function, check constraint (`23514`) |
| `limit` | limite di import raggiunto (429) |
| `network` | errore di rete (il `TypeError` di fetch) o timeout |
| `server` | tutto il resto |

Comportamento della UI:
- **Resta invariato** dove la UI gestisce già gli errori:
  - salvataggio in Home, con il toast;
  - summary Live, dove qualunque errore manda l'allenamento nella coda `pending-workouts`;
  - flush della coda in `AppLayoutClient`.
- **Si aggiunge un toast d'errore** dove oggi gli errori si ignorano in silenzio:
  - archivio schede (CRUD, duplica, riordino);
  - storico pesi;
  - eliminazione di un allenamento in Home.
- **I caricamenti** (`loadWorkouts`, `loadSchede`, `loadWeightLogs`) restano silenziosi, con `console.error`, come oggi.

### 5.6 Client e sessione
`lib/supabase.ts` resta l'unico punto in cui si crea il client, e il livello dati lo riceve da lì. In Fase 4 lì si aggiungerà lo storage adapter `@capacitor/preferences` per il nativo, senza toccare il livello dati. Il Keychain si rivaluta prima di MNGMT1.

### 5.7 Rollback
Le route restano online, inutilizzate, fino a P4: per annullare un passo basta il `git revert` del suo commit. Le migration di questo design o sono additive o restringono policy. Per la correzione RLS è già pronta la migration inversa, cioè le definizioni attuali del §7.1.

## 6. Fase 2 — passi

| Passo | Contenuto | Dove | Push |
|---|---|---|---|
| 0 | audit RLS e correzione policy; Vitest; suite `test:rls` / `test:db`; tipi DB | sessione | con P1 |
| 1 | **workouts** (list, create, update, remove) e basi del livello dati (`index`, `types`, `errors`, `session`) | sessione | **P1** |
| 2B | **schede**: CRUD di schede, tipi ed esercizi, riordino, SQL di `duplica_scheda` | subagent | **P2** |
| 2D | **weight-logs** | subagent | **P2** |
| 2C-spike | spike di import-pdf (§9.1), in parallelo con 2B e 2D | sessione | — |
| 2C | import-pdf completo: funzione, SQL di `ai_usage`, client `importPdf.ts` | subagent | — |
| 3 | deploy di import-pdf e aggancio in archivio (dopo il merge di 2B) | sessione | **P3** |
| 4 | pulizia | sessione | **P4** |

- **Il passo 0 viene prima del resto della Fase 2** e dipende dagli utenti di test.
- **Workouts si fa per primo** perché è l'unica risorsa con CRUD completo, mapping e coda offline. Fissa le convenzioni ed è la più delicata, perché tocca la Live, quindi la seguo direttamente.
- **Parallelismo**: ogni task subagent lavora in un worktree separato.

  | Task | File propri | File condivisi (modifica minima) |
  |---|---|---|
  | 2B | `lib/data/schede.ts` (+test), `app/(app)/schede/archivio/page.tsx`, SQL `duplica_scheda` | `AppProvider` (`loadSchede`), `lib/data/index.ts` |
  | 2D | `lib/data/weightLogs.ts` (+test), `components/modals/StoricoPesiModal.tsx` | `AppProvider` (`loadWeightLogs`), `lib/data/index.ts` |
  | 2C | `supabase/functions/import-pdf/*`, SQL `ai_usage`, `lib/data/importPdf.ts` (+test) | `lib/data/index.ts`, `tsconfig.json` |

  Il merge va in ordine 2B → 2D → 2C. I conflitti attesi riguardano solo le righe condivise. Migration e deploy li faccio io in sessione, al merge.
- **Una risorsa è finita quando**:
  - `tsc` e build sono verdi;
  - i test unit dei mapping passano;
  - `test:db` è verde sulle tabelle toccate;
  - nessun call site punta più alle route della risorsa (si verifica con `grep`);
  - la prova manuale del §10.4 è fatta.
- **Pulizia (passo 4)**:
  - si eliminano le 13 route rimaste in `app/api/**` (le 12 CRUD e `import-pdf`), `lib/auth.ts`, `apiFetch` (da `AppProvider` e dal contesto), i test di parità e `@anthropic-ai/sdk`;
  - si aggiorna il messaggio «ANTHROPIC_API_KEY mancante» in archivio;
  - `grep "/api/"` sul codice dell'app deve tornare vuoto.

## 7. RLS

### 7.1 Stato attuale
Query in sola lettura, eseguita il 2026-10-13.

| Tabella | Policy (ALL, ruolo `public`) | Condizione |
|---|---|---|
| `schede` | `users_own_schede` | `auth.uid() = user_id` |
| `tipi` | `users_own_tipi` | esiste la scheda padre con `user_id = auth.uid()` |
| `esercizi` | `users_own_esercizi` | esiste tipo → scheda con `user_id = auth.uid()` |
| `blocchi` | `user owns blocchi` | `auth.uid() = user_id` |
| `exercises` | `user owns exercises` | `auth.uid() = user_id` |
| `workouts` | `users_own_workouts` | `auth.uid() = user_id` |
| `weight_logs` | `users_own_weight_logs` | `auth.uid() = user_id` |

- **WITH CHECK**: nessuna policy ne ha uno proprio. Per le policy ALL, Postgres applica l'USING anche alle scritture.
- **Colonne**: gli id sono `text` generati dal client, tranne `exercises.id`, che è uuid. `user_id` è uuid senza default.
- **Cascade**: schede → tipi → blocchi ed esercizi; blocchi → esercizi.

### 7.2 Problemi
1. **`blocchi`**: la policy controlla solo `user_id`, non che il tipo padre sia dell'utente. Un utente può quindi agganciare un blocco a un tipo altrui. Il proprietario non lo vede, ma è comunque una scrittura nel suo albero.
2. **`esercizi`**: la policy controlla il tipo ma non `blocco_id` né `exercise_id`, quindi un esercizio può puntare a blocchi o a esercizi canonici altrui. Qui rientra SEC1.
3. **`tipi` ed `esercizi`**: la colonna `user_id` non viene verificata.
4. **Cancellazione account** (prima di TestFlight): le FK `user_id` di `schede`, `tipi`, `esercizi`, `workouts` e `weight_logs` sono NO ACTION. Eliminare un utente auth fallisce finché ha dati. Si annota, ora non si tocca.

### 7.3 Correzione
**Prima, in sola lettura**: si contano le righe esistenti che violerebbero le nuove regole.
```sql
-- (a) blocchi il cui tipo padre appartiene a un altro utente
select count(*) from public.blocchi b
join public.tipi t on t.id = b.tipo_id join public.schede s on s.id = t.scheda_id
where b.user_id is distinct from s.user_id;
-- (b) esercizi che puntano a un blocco di un altro utente
select count(*) from public.esercizi e
join public.tipi t on t.id = e.tipo_id join public.schede s on s.id = t.scheda_id
join public.blocchi b on b.id = e.blocco_id
where b.user_id is distinct from s.user_id;
-- (c) esercizi che puntano a un exercise di un altro utente
select count(*) from public.esercizi e
join public.tipi t on t.id = e.tipo_id join public.schede s on s.id = t.scheda_id
join public.exercises x on x.id = e.exercise_id
where x.user_id is distinct from s.user_id;
-- (d) tipi ed (e) esercizi con user_id diverso dal proprietario della scheda
select count(*) from public.tipi t join public.schede s on s.id = t.scheda_id
where t.user_id is distinct from s.user_id;
select count(*) from public.esercizi e join public.tipi t on t.id = e.tipo_id
join public.schede s on s.id = t.scheda_id where e.user_id is distinct from s.user_id;
```

**La migration** usa `ALTER POLICY`, non modifica dati, passa le policy al ruolo `authenticated` e usa `(select auth.uid())` per efficienza:
- **`blocchi`**: USING invariato. WITH CHECK: `user_id` dell'utente **e** tipo padre dell'utente.
- **`esercizi`**: USING invariato. WITH CHECK: la condizione di oggi, **più** `blocco_id` nullo o blocco dell'utente, **più** `exercise_id` nullo o exercise dell'utente.
- **`tipi` ed `esercizi`**: si aggiunge `user_id = (select auth.uid())` al WITH CHECK **solo se** i conteggi (d) ed (e) valgono 0. Altrimenti resta fuori, e propongo un backfill a parte.
- **Inversa pronta**: sono le definizioni attuali (§7.1).

**Procedura:**
1. mostro a Fabrizio conteggi e SQL;
2. aspetto il suo ok;
3. applico con `apply_migration`;
4. `test:rls` deve diventare verde: i casi del §10.2 che oggi falliscono devono passare.

Nota per MNGMT1: con la libreria esercizi globale (`exercises.user_id IS NULL`) la condizione su `exercise_id` andrà estesa. Il documento di audit è il riferimento comune.

### 7.4 Documento di audit
Va scritto in `docs/superpowers/notes/rls-audit.md` prima di spegnere la prima route.

Per ogni tabella contiene:
- le policy per operazione (SELECT, INSERT, UPDATE, DELETE, compreso WITH CHECK);
- FK e cascade;
- i problemi;
- i casi di test e il loro risultato.

Copre anche SEC1, la RPC `duplica_scheda`, `ai_usage` e la Edge Function. È il documento condiviso con il disegno RLS di MNGMT1.

## 8. RPC `duplica_scheda`
```sql
create or replace function public.duplica_scheda(
  p_src_id text, p_new_id text, p_nome text, p_mese text
) returns text
language plpgsql security invoker set search_path = ''
as $$ … $$;  -- corpo completo nel piano di implementazione
revoke execute on function public.duplica_scheda(text, text, text, text) from public, anon;
grant  execute on function public.duplica_scheda(text, text, text, text) to authenticated;
```
- **Permessi**: la funzione è SECURITY INVOKER, quindi la RLS vale anche qui e si possono duplicare solo le proprie schede. Su una scheda altrui risponde `P0002` (`not_found`); senza sessione `42501`.
- **Atomicità**: tutto avviene in una transazione, quindi o si copia tutto o niente.
- **La scheda copiata**:
  - **id**: è `p_new_id`, generato dal client con `newId()`. La lista è ordinata per id, e un UUID finirebbe in una posizione casuale.
  - **nome**: `p_nome`, oppure «<originale> (copia)».
  - **mese**: `p_mese`, oppure `''`.
  - **`data_inizio` e `weeks`**: nulli.
  - **`user_id`**: `auth.uid()`.
- **Tipi, blocchi ed esercizi**:
  - mantengono l'`ordine` originale e ricevono id nuovi (`gen_random_uuid()::text`);
  - `blocco_id` viene rimappato con una mappa vecchio→nuovo per ogni tipo;
  - gli esercizi si copiano con **tutti** i campi: `titolo`, `ripetizioni`, `carico`, `recupero`, `note`, `ordine`, `sets_target`, `exercise_id`, `rest_seconds`.
- **Risultato**: la funzione restituisce `p_new_id`, e il client ricarica l'elenco come oggi.
- **Manutenzione**: se in futuro si aggiungono colonne a quelle tabelle, la funzione va aggiornata. Il test funzionale di `test:db` verifica la copia campo per campo.

## 9. Edge Function `import-pdf`

### 9.1 Spike (cancello)
- La funzione si implementa direttamente come `import-pdf`. Nessun client la chiama finché non la aggancio al passo 3, quindi non restano funzioni di prova da cancellare.
- Le prove si fanno con l'utente di test 1 su 1–2 PDF reali di Fabrizio, compreso il più pesante, e su un file sintetico vicino al limite di 10 MB. Tra i PDF c'è `test sk.pdf`: sulla route Next corretta (`871efb3`) produce 3122 token in 45 s, con `end_turn`.
- **Cosa si misura**:
  - il tempo totale e la sua ripartizione tra Claude e il resto;
  - l'avvio a freddo rispetto a quello a caldo;
  - la dimensione massima accettata;
  - l'uso di CPU dai log (limite 2 s per richiesta);
  - il rispetto dei limiti documentati: 150 s di wall clock sul piano Free e 150 s di idle timeout.
- **Confronto tra modelli sullo stesso PDF**: `claude-sonnet-4-6` (l'attuale) e il Sonnet più recente (oggi `claude-sonnet-5-5`).
  - **Tempi.**
  - **Costo**: token di input e output restituiti dall'API, moltiplicati per il listino Anthropic in vigore.
  - **Qualità**: giorni, blocchi ed esercizi estratti rispetto a quelli attesi, corretta separazione di ripetizioni, carico e note, errori evidenti. I risultati vanno in una tabella affiancata.
- L'esito va in `docs/superpowers/notes/ap1-spike-import-pdf.md`. **Modello e timeout li decide Fabrizio.**
- In Deno non serve una libreria PDF: il PDF va a Claude in base64, come oggi.
- **Ripiego**: se i limiti non reggono, si passa a una funzione Vercel chiamata via rete. Dove tenere la chiave si decide dopo la prova.

### 9.2 La funzione
```
supabase/functions/import-pdf/
  index.ts    Deno.serve: CORS, auth, limite, file, chiamata a Claude, scritture, risposta
  config.ts   costanti: unico punto da modificare
  prompt.ts   il prompt di oggi, invariato
  core.ts     puro, senza import: estrae e normalizza il JSON di Claude (regole di oggi)
              e trasforma l'albero normalizzato in righe DB (id tramite newId iniettato, ordine, user_id)
```
Parse e trasformazione in righe stanno in un solo `core.ts` senza import: Deno vuole l'estensione `.ts` negli import relativi, mentre il `tsc` di Next la rifiuta (deciso nel piano, 2026-10-13).
```ts
// config.ts
export const IMPORT_PDF_DAILY_LIMIT = 10;            // per utente; con MNGMT1 potrà dipendere dal ruolo
export const IMPORT_PDF_WINDOW_HOURS = 24;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';  // decisione dopo lo spike
export const CLAUDE_TIMEOUT_MS = 120_000;            // sotto i 150 s di idle timeout
export const ALLOWED_ORIGINS = [
  'https://allenamenti-app.vercel.app', 'http://localhost:3000',
  'capacitor://localhost', 'https://localhost',
];
```
Flusso di una richiesta:
1. **CORS**: `OPTIONS` riceve il preflight solo dalle origini ammesse. Una richiesta con un'origine non ammessa riceve 403. Le richieste senza Origin, cioè non da browser, passano comunque dal controllo JWT.
2. **JWT**: `verify_jwt` è attivo, quindi la piattaforma rifiuta le richieste senza un JWT valido. Nel codice, `getUser(token)` ricava l'utente; se manca, 401.
3. **Limite**: si contano le righe `ai_usage` dell'utente per `import-pdf` nelle ultime `IMPORT_PDF_WINDOW_HOURS`, col client dell'utente e quindi sotto RLS. Se sono almeno `IMPORT_PDF_DAILY_LIMIT`, 429.
4. **File**: è il campo `pdf` del multipart. Deve essere un PDF (altrimenti 400) e non superare `MAX_PDF_BYTES` (altrimenti 413).
5. **Registrazione**: si inserisce una riga in `ai_usage`, così si contano i tentativi che arrivano a Claude.
6. **Claude**: chiamata via `fetch` alla Messages API, col documento in base64, `max_tokens` 16000 e il prompt che chiede JSON compatto. Sono i valori della correzione del 2026-10-20 (`871efb3`): con 4096 token e JSON indentato le schede lunghe venivano troncate. Se `stop_reason` è `max_tokens`, la funzione risponde con un errore esplicito invece di tentare il parse. La chiave si legge con `Deno.env.get('ANTHROPIC_API_KEY_EDGE')`; il timeout è `CLAUDE_TIMEOUT_MS`.
7. **Parsing**: `parse.ts` estrae e normalizza il JSON; se non è valido, 422.
8. **Scritture**: `rows.ts` prepara le righe, che si inseriscono col client dell'utente (RLS): scheda, tipi, blocchi, esercizi. Se un insert fallisce si cancella la scheda appena creata, le cascade puliscono il resto e la risposta è 500.
9. **Risposta**: 201, con la stessa forma di oggi (la scheda con `tipi`, `esercizi` e `blocchi`).

**Codici di errore:**

| Codice | Causa |
|---|---|
| 401 | autenticazione mancante o non valida |
| 403 | origine non ammessa |
| 400 | file mancante o non PDF |
| 413 | file troppo grande |
| 429 | limite di import raggiunto |
| 422 | risposta AI non valida |
| 502 | errore o timeout di Claude |
| 500 | chiave mancante o errore DB |

**Log**: non contengono il contenuto del PDF. Di una risposta AI non valida si registrano al massimo i primi 300 caratteri, come oggi.

**Riuso per MNGMT1**: parsing e scrittura sono moduli separati, quindi la preview del trainer potrà usare il parsing senza scrivere.

### 9.3 Tabella `ai_usage`
```sql
create table public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fn         text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_fn_created_idx on public.ai_usage (user_id, fn, created_at desc);
alter table public.ai_usage enable row level security;
create policy "ai_usage: lettura proprie righe" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_usage: inserimento proprie righe" on public.ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- nessuna policy di update/delete: il contatore non si azzera dal client
```

### 9.4 Client
- **`lib/data/importPdf.ts`**:
  - invia una POST multipart a `${SUPABASE_URL}/functions/v1/import-pdf`, con `Authorization: Bearer <access_token>` e `apikey` (la chiave anon);
  - il timeout lo fissa l'esito dello spike; oggi lato client è 55 s;
  - restituisce un `ImportPdfResult`, oppure un `DataError` di tipo `limit`, `invalid`, `auth`, `network` o `server`.
- **Archivio**:
  - i messaggi di avanzamento restano gli stessi;
  - nuovi messaggi d'errore per il limite («Hai raggiunto il limite di 10 import in 24 ore»), per il servizio non configurato e per il PDF troppo grande;
  - sparisce il riferimento a `ANTHROPIC_API_KEY` e `.env.local`.

### 9.5 Fine migrazione (Fabrizio)
Rimuovere `ANTHROPIC_API_KEY` da Vercel e revocare la vecchia chiave. Sulla console Anthropic, il limite di spesa resta impostato per la chiave nuova.

## 10. Test e verifiche

### 10.1 Unit — `npm test`
Vitest, senza rete.

Cosa copre:
- i mapping di `workouts`, `schede` e `weightLogs`. Per l'albero FIX6 delle schede: la partizione tra esercizi singoli e blocchi, gli ordinamenti e i default;
- la conversione degli errori (`errors.ts`);
- `core.ts` della Edge Function, che è un modulo TS puro, senza API Deno.

Configurazione: alias `@/`; `tsconfig` che esclude `supabase/functions/**/index.ts`, che è codice Deno.

### 10.2 Isolamento — `npm run test:rls`
Gira con Vitest e una configurazione separata, contro produzione, con i due utenti di test (credenziali da `.env.local`). Usa supabase-js «grezzo», con la chiave anon e la sessione utente: è quello che può fare un client malevolo. Mai la service role.

**Casi**: l'utente 2 crea le fixture, l'utente 1 prova ad accedervi.
- **Per ogni tabella**:
  - `select` per id → 0 righe;
  - `update` e `delete` per id → nessuna riga toccata, verificato rileggendo come utente 2;
  - `insert` con il `user_id` dell'utente 2 → rifiutato.
- **Agganci rifiutati**:
  - un tipo nella scheda dell'utente 2;
  - un esercizio nel suo tipo;
  - un blocco nel suo tipo;
  - un esercizio con il suo `blocco_id` o il suo `exercise_id`.

  I casi su blocco ed esercizio oggi falliscono: devono passare dopo la correzione del §7.3.
- **RPC**: `duplica_scheda` sulla scheda dell'utente 2 → `not_found`.
- **`ai_usage`**: le righe dell'utente 2 sono invisibili; `update` e `delete` delle proprie righe non toccano nulla.
- **Edge Function**:
  - senza JWT → 401;
  - con un'origine non ammessa → 403;
  - il test del limite (429) gira solo con `RLS_TEST_QUOTA=1` e sull'utente 2, perché ne riempie il contatore per 24 ore: le righe non si cancellano dal client.
- **Utente anonimo** (nessuna sessione): su tutte le tabelle la `select` torna vuota e l'`insert` viene rifiutata.

**Fixture e pulizia:**
- le creano gli utenti di test, marcate `[rls-test]` nel `nome` delle schede, nelle `note` e in `es_nome`;
- **verifica prima di cancellare**: lo script raccoglie le righe marcate e controlla che ogni `user_id` sia uno dei due utenti di test. Se trova altro, si interrompe senza cancellare nulla;
- si cancella solo per id e solo le righe verificate; i figli di una scheda se ne vanno con la cascade;
- la stessa pulizia verificata gira anche all'avvio, per gli avanzi di run interrotti.

### 10.3 Database — `npm run test:db`
Comprende `test:rls` e in più:
- **test funzionali**, con l'utente di test 1:
  - la duplica copia campo per campo scheda, tipi, blocchi ed esercizi;
  - import-pdf scrive l'albero atteso. Questo test usa un PDF piccolo e gira solo con `DB_TEST_IMPORT=1`, perché costa una chiamata a Claude;
- **test di parità**, temporanei fino a P4: per ogni risorsa si chiamano il vecchio route handler come funzione, senza server, con una `Request` e il JWT dell'utente di test, e la nuova funzione, poi si confronta il JSON. Gli id generati si escludono dal confronto.

Pulizia: stessa regola di verifica del §10.2.

### 10.4 Prova manuale
La fa Fabrizio con l'utente di test 1, sul build locale. Io avvio il server (`npm run build && npm start`) e preparo la checklist.

- **Sempre, sul flusso Live**:
  1. login;
  2. Home;
  3. Live su una scheda e countdown;
  4. almeno due serie con recupero, e il blocco AMRAP se c'è;
  5. Summary → Salva;
  6. l'allenamento compare in Home;
  7. eliminarlo.
- **P1**: in più, modifica di un allenamento da Home e salvataggio offline. In modalità aereo l'allenamento finisce in coda, e alla riapertura si sincronizza.
- **P2**: in più:
  - in archivio: creare, rinominare ed eliminare scheda, giorno ed esercizio; riordino; duplica, verificando che la copia abbia blocchi e campi;
  - nello storico pesi: aggiungere ed eliminare.
- **P3**: in più, import di un PDF reale.
- **P4**: tutto quanto sopra.

### 10.5 Cancello prima di ogni push
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm test`
4. `npm run test:db`, da P1 in poi
5. la prova manuale del §10.4
6. per i commit rimasti solo in locale, `git show --stat` e l'ok di Fabrizio

## 11. Rischi

| Rischio | Mitigazione |
|---|---|
| Regressioni nella forma dei dati | mapping puri testati, test di parità, prova manuale |
| Buchi RLS col client diretto | audit, correzione prima di P1, `test:rls` a ogni push |
| Limiti della Edge Function (tempo, payload) | spike prima di costruire; ripiego su Vercel |
| Conflitti tra subagent | file propri per ogni task; merge in sequenza; operazioni su produzione solo in sessione |
| Regressioni dal bump di Next (nuova minor) | build e prova manuale prima di P0; `git revert` |
| Unico DB, che è la produzione | migration additive o mostrate prima; fixture verificate prima di cancellare; niente service role |
| Credenziali | token fuori dall'URL e dalla chat; le chiavi le gestisce solo Fabrizio |

## 12. Fuori perimetro
- **Fase 1, export statico**: è il piano successivo. Proposta da decidere: introdurre lì 5–6 test e2e Playwright sul flusso Live (il rischio 5 del BACKLOG). Servirebbero a validare l'export e poi come cancello automatico dei push.
- **Fasi successive**:
  - Fase 4: guscio nativo, adapter Preferences, router custom, auth via web;
  - OFF1, compreso il `client_mutation_id` tramite RPC;
  - Fasi 5 e 6.
- **Prima di TestFlight**: cancellazione account in-app e App Privacy label (sulle FK NO ACTION vedi §7.2).
- **Prima di MNGMT1**: il progetto Supabase di sviluppo.
- **Altro**: riordino esercizi atomico; `circuito_giri`; cambio del modello AI, salvo decisione dopo lo spike.
