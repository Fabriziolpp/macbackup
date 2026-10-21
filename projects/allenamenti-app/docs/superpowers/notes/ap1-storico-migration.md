# AP1 P0 — Riallineamento dello storico migration

> 2026-10-14 · progetto `lzwyhokkvzxlnubsenmf` · spec `docs/superpowers/specs/2026-10-13-ap1-igiene-fase2-design.md` §4.5

## Prima (`list_migrations`)

```
{"migrations":[{"version":"20260318153406","name":"create_tables"},{"version":"20260612094108","name":"q1_infra"},{"version":"20260621203459","name":"fix6_blocchi"}]}
```

## Interventi

1. Rinominati i file locali con le versioni remote:
   - `20260528000000_q1_infra.sql` → `20260612094108_q1_infra.sql`
   - `20260621000000_fix6_blocchi.sql` → `20260621203459_fix6_blocchi.sql`
2. Aggiunto `20260318153406_create_tables.sql`, ricavato dallo statement conservato nello storico remoto.
3. Registrata nello storico remoto `20260429000000_live_mode`, che era stata applicata fuori banda: le colonne esistevano già. Lo schema non cambia.

## Verifica di `live_mode` sul remoto, prima della registrazione (sola lettura, 2026-10-14)

| Colonna | Tipo atteso | Trovato | Default | Nullable | Esito |
|---|---|---|---|---|---|
| `schede.data_inizio` | date | date | — | sì | ok |
| `schede.weeks` | smallint | smallint | — | sì | ok |
| `esercizi.sets_target` | smallint | smallint | — | sì | ok |
| `workouts.sets_completed` | smallint | smallint | — | sì | ok |
| `workouts.sets_total` | smallint | smallint | — | sì | ok |
| `workouts.exercises_completed` | smallint | smallint | — | sì | ok |
| `workouts.exercises_total` | smallint | smallint | — | sì | ok |
| `workouts.programma_week` | smallint | smallint | — | sì | ok |
| `workouts.voice_note_transcript` | text | text | — | sì | ok |
| `workouts.source` | text | text | `'manual'::text` | sì | ok |
| backfill: `workouts.source IS NULL` | 0 righe | 0 | | | ok |

## Registrazione (2026-10-14)

Prima dell'INSERT ho verificato che il testo registrato fosse identico byte per byte al file locale `20260429000000_live_mode.sql` (md5 `bded290f2d9f7bc4ded963572b097a3a`). L'INSERT ha restituito lo stesso md5. Approvata da Fabrizio dopo aver visto la verifica qui sopra.

## Dopo (`list_migrations`)

```
{"migrations":[{"version":"20260318153406","name":"create_tables"},{"version":"20260429000000","name":"live_mode"},{"version":"20260612094108","name":"q1_infra"},{"version":"20260621203459","name":"fix6_blocchi"}]}
```

Locale e remoto coincidono: 4 versioni, stessi nomi.

## Convenzione da qui in avanti

1. Scrivere il file SQL con un nome provvisorio: `supabase/migrations/pending_<nome>.sql`.
2. Applicarlo con `apply_migration`, usando `<nome>` come nome.
3. Leggere con `list_migrations` la versione assegnata.
4. `git mv` del file in `<versione>_<nome>.sql`.
5. Rigenerare i tipi DB (`lib/data/db.types.ts`, dalla Fase 2).
6. Committare.

## Cosa NON c'è nello storico

`create_tables` crea solo le cinque tabelle originali (`workouts`, `schede`, `tipi`, `esercizi`, `weight_logs`) con i loro indici. **Nessuna migration contiene**:
- le colonne `user_id` di quelle tabelle;
- le FK verso `auth.users`;
- l'attivazione della RLS;
- le policy `users_own_*`.

Sono state applicate fuori banda. Uno schema ricreato solo dalle migration, per esempio il progetto Supabase di sviluppo da valutare prima di MNGMT1, nascerebbe **senza RLS**: prima serve una migration di baseline che le ricrei. Va annotato anche nell'audit RLS della Fase 2.
