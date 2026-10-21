---
name: supabase-prod-safety
description: "L'unico progetto Supabase è la produzione; niente operazioni distruttive; le verifiche si fanno con due utenti di test, mai con la service role"
metadata:
  node_type: memory
  type: project
  originSessionId: 63065d2a-d675-4fe2-8452-feef23d04466
  modified: 2026-10-13T15:02:29.008Z
---

Il progetto Supabase `lzwyhokkvzxlnubsenmf` è l'unico, ed è la produzione. Regole:
- niente operazioni distruttive su dati reali o sullo schema;
- le migration additive previste dal design si possono applicare; quelle che cambiano policy o toccano dati esistenti le mostro prima a Fabrizio;
- le prove usano **due** utenti di test, con le credenziali in `.env.local` (`TEST_USER_EMAIL`/`TEST_USER_PASSWORD`, `TEST_USER_2_EMAIL`/`TEST_USER_2_PASSWORD`): con un utente solo non si dimostra l'isolamento RLS;
- i test cancellano solo le fixture create dagli utenti di test stessi;
- mai service role key nei test o nel client.

Un progetto Supabase di sviluppo si rivaluta prima di MNGMT1.

**Why:** risposte del 2026-10-13 (domande 7 e 13 sulla conversione AP1).

**How to apply:** prima di toccare lo storico migration, esegui `list_migrations` e salva l'output. Le query di sola lettura (`pg_policies`, `information_schema`) sono sempre ok. Vedi [[api-keys-never-read]] e [[push-gate-main]].
