---
name: api-keys-never-read
description: "Le chiavi API (es. ANTHROPIC_API_KEY_EDGE) le imposta Fabrizio; io non le leggo mai, nemmeno da .env.local"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 63065d2a-d675-4fe2-8452-feef23d04466
  modified: 2026-10-13T15:02:22.675Z
---

Le chiavi API le crea e le imposta Fabrizio: in `.env.local` e nei secret delle Edge Function Supabase, dal dashboard. Io non leggo mai il loro valore. Per la Edge Function `import-pdf` il secret si chiama `ANTHROPIC_API_KEY_EDGE`.

**Why:** 2026-10-13, testuale: «La chiave nuova la metto io (ANTHROPIC_API_KEY_EDGE), tu non la leggi mai». Vincolo assoluto di AP1: la chiave Anthropic non deve mai finire nel bundle nativo.

**How to apply:** niente `cat`/`grep` che stampino valori da `.env.local`; per verificare la presenza di una chiave uso solo conteggi (`grep -c NOME=`). Non uso `create_edge_function_secret` con il valore: chiedo a lui di impostare il secret. Lo stesso vale per i token GitHub. Vedi [[supabase-prod-safety]].
