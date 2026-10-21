# Audit RLS — riferimento condiviso (AP1 Fase 2 e MNGMT1)

> Prima versione: 2026-10-20, AP1 Fase 2 passo 0. Progetto `lzwyhokkvzxlnubsenmf`.
> Spec: `docs/superpowers/specs/2026-10-13-ap1-igiene-fase2-design.md` §7. Test: `npm run test:rls`.
> È la base delle policy cross-utente di MNGMT1: va aggiornato a ogni migration che tocca la RLS.

## Modello di accesso

Dopo AP1 il client parla direttamente con Supabase, con la chiave anon e il JWT dell'utente: **la RLS è l'unica guardia**. Nessuna service role nel client né nei test. Gli id sono `text` generati dal client (`exercises.id` è uuid). `user_id` è uuid senza default: lo imposta il client, e la policy lo verifica.

## Tabelle (stato prima della correzione, 2026-10-20)

| Tabella | Policy (ALL, ruolo `public`) | USING = WITH CHECK |
|---|---|---|
| `schede` | `users_own_schede` | `auth.uid() = user_id` |
| `tipi` | `users_own_tipi` | esiste la scheda padre con `user_id = auth.uid()` |
| `esercizi` | `users_own_esercizi` | esiste tipo → scheda con `user_id = auth.uid()` |
| `blocchi` | `user owns blocchi` | `auth.uid() = user_id` |
| `exercises` | `user owns exercises` | `auth.uid() = user_id` |
| `workouts` | `users_own_workouts` | `auth.uid() = user_id` |
| `weight_logs` | `users_own_weight_logs` | `auth.uid() = user_id` |

Nessuna policy ha un WITH CHECK proprio: per le policy ALL Postgres applica l'USING anche alle scritture.

**FK e cascade:**
- `tipi.scheda_id → schede` (cascade);
- `blocchi.tipo_id → tipi` (cascade);
- `esercizi.tipo_id → tipi` (cascade);
- `esercizi.blocco_id → blocchi` (cascade);
- `esercizi.exercise_id → exercises` (no action);
- `user_id → auth.users`: cascade su `blocchi` ed `exercises`; **no action** su `schede`, `tipi`, `esercizi`, `workouts` e `weight_logs`.

## Problemi trovati

1. `blocchi`: la policy controllava solo `user_id`, quindi si poteva agganciare un blocco a un tipo altrui.
2. `esercizi`: `blocco_id` ed `exercise_id` non erano verificati, quindi si poteva puntare a righe altrui. È SEC1.
3. `tipi`, `esercizi`: la colonna `user_id` non era verificata.
4. Cancellazione account (prima di TestFlight): le FK `user_id` in no action bloccano l'eliminazione di un utente auth finché ha dati. **Aperto**: da risolvere nel task «Cancellazione account in-app».

Nessuno di questi problemi esponeva dati altrui in lettura.

## Conteggi prima della correzione (2026-10-20)

| Controllo | Righe |
|---|---|
| (a) blocchi con tipo altrui | 0 |
| (b) esercizi con blocco altrui | 0 |
| (c) esercizi con exercise altrui | 0 |
| (d) tipi con user_id diverso dal proprietario | 0 |
| (e) esercizi con user_id diverso dal proprietario | 0 |

Totali al momento del controllo: 57 tipi, 380 esercizi, 21 blocchi. Con (d) ed (e) a zero, la migration include anche il controllo di `user_id` su tipi ed esercizi.

## Correzione

Migration `20261020213547_rls_riferimenti.sql`, applicata il 2026-10-20 dopo l'ok di Fabrizio. Le policy di `blocchi`, `esercizi` e `tipi` sono passate al ruolo `authenticated`, e il loro WITH CHECK verifica i riferimenti (vedi il file).

Controlli fatti prima dell'applicazione:
- **Conteggi (a)–(e)**: tutti a 0. Più un controllo diretto dei `user_id` NULL su tutte e 7 le tabelle: 0 ovunque. Più le righe orfane (giorni senza scheda, esercizi senza giorno): 0. Le colonne `user_id` non hanno il vincolo NOT NULL, ma il WITH CHECK `user_id = auth.uid()` impedisce di scrivere un NULL.
- **Chi scrive**: su `blocchi`, `tipi` ed `esercizi` scrivono solo le route Next. Usano tutte il client di `lib/auth.ts` (chiave anon + JWT utente, ruolo `authenticated`) e impostano sempre il `user_id` dell'utente. Nessuna service role (né nel codice né in `.env.local`), nessuna scrittura anonima, nessuna Edge Function.

Verifiche dopo l'applicazione:
- `npm run test:rls`: 42 test su 42 passano.
- `tests/db/parity/routes-scrittura.test.ts`: le route in uso funzionano anche con le policy nuove: creazione e modifica di scheda, giorno ed esercizio, blocco AMRAP, riordino (`PUT /reorder`) e duplica. Il test era verde anche prima della migration.
- Advisor di sicurezza: nessun avviso nuovo; resta solo «Leaked password protection disabled».

Inversa, solo in caso di problemi: ripristina le policy del 2026-10-20.

```sql
alter policy "user owns blocchi" on public.blocchi to public
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter policy users_own_esercizi on public.esercizi to public
  using (exists (select 1 from public.tipi join public.schede on schede.id = tipi.scheda_id
                 where tipi.id = esercizi.tipo_id and schede.user_id = auth.uid()))
  with check (exists (select 1 from public.tipi join public.schede on schede.id = tipi.scheda_id
                      where tipi.id = esercizi.tipo_id and schede.user_id = auth.uid()));
alter policy users_own_tipi on public.tipi to public
  using (exists (select 1 from public.schede where schede.id = tipi.scheda_id and schede.user_id = auth.uid()))
  with check (exists (select 1 from public.schede where schede.id = tipi.scheda_id and schede.user_id = auth.uid()));
```

## Casi di test (`tests/db/rls.test.ts`)

| Gruppo | Prima della correzione (2026-10-20) | Dopo (2026-10-20) |
|---|---|---|
| select / update / delete sulle righe dell'utente 2 (7 tabelle, 21 test) | passano | passano |
| insert a nome dell'utente 2 (5 tabelle) | passano | passano |
| agganci a scheda o tipo altrui; spostamento di un tipo (3 test) | passano | passano |
| blocco in tipo altrui; `blocco_id` ed `exercise_id` altrui (3 test) | **falliscono** | passano |
| `user_id` altrui su tipi ed esercizi (2 test) | **falliscono** | passano |
| utente anonimo (8 test) | passano | passano |

Totale: prima 37 passano e 5 falliscono; dopo, 42 su 42. Successivi: RPC `duplica_scheda` (Task 6), `ai_usage` (Task 11), Edge Function `import-pdf` (Task 15).

## Da fare per MNGMT1

- Policy trainer/trainee/superadmin a partire da questa tabella.
- Libreria esercizi globale (`exercises.user_id IS NULL`): la regola SEC1 su `exercise_id` oggi richiede `exercises.user_id = utente`. Va allargata a `x.user_id is null or x.user_id = (select auth.uid())`.
- FK `user_id` in no action (problema 4).
- Lo storico migration non contiene le colonne `user_id`, le FK verso `auth.users`, l'attivazione della RLS né le policy `users_own_*`, applicate fuori banda (`docs/superpowers/notes/ap1-storico-migration.md`). Prima di creare un progetto di sviluppo serve una migration di baseline che le ricrei.
