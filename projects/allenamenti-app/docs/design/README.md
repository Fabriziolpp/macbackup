# `docs/design/` — libreria di handoff di design

Questa cartella raccoglie i **bundle di handoff** generati da Claude Design (claude.ai/design) per le pagine dell'app. Sono **reference, non codice**: prototipi HTML/CSS/JS da cui leggere layout, token, componenti e interazioni quando si sviluppa o si migra una pagina.

La source of truth del design system rimane [`/DESIGN.md`](../../DESIGN.md) (token `--gt-*`, classi `.gt-*`, regole di implementazione). Quando `DESIGN.md` è generico, `docs/design/<pagina>/` fornisce lo specifico pixel-close della pagina.

---

## Mappa handoff → pagina

| Design | Primary prototype | Spec dettagliato | Pagina target nel repo |
|---|---|---|---|
| Home | [`Home/project/GymTonic Home.html`](Home/project/GymTonic%20Home.html) | [`Home/project/design_handoff_gymtonic_home/README.md`](Home/project/design_handoff_gymtonic_home/README.md) | `app/(app)/home/page.tsx` (già GymTonic) |
| Settimana | [`Settimana/project/GymTonic Settimana.html`](Settimana/project/GymTonic%20Settimana.html) | — (vedi prototype + `DESIGN.md`) | `app/(app)/settimana/page.tsx` (legacy Nike — da migrare) |
| Mese | [`Settimana/project/GymTonic Mese.html`](Settimana/project/GymTonic%20Mese.html) | — | `app/(app)/mese/page.tsx` (legacy Nike — da migrare) |
| Anno | [`Settimana/project/GymTonic Anno.html`](Settimana/project/GymTonic%20Anno.html) | — | `app/(app)/anno/page.tsx` (legacy Nike — da migrare) |

> **Nota**: i bundle `Home/project/` e `Settimana/project/` contengono lo stesso set di prototipi (Home, Settimana, Mese, Anno). Sono due esportazioni del progetto Claude Design intero, con README al top level che punta al file che l'utente aveva aperto al momento dell'export. Tutti e quattro i prototipi sono validi come reference — usare i path della tabella sopra.

---

## Come usarli

1. Leggere **`DESIGN.md`** per token, classi `.gt-*` e filosofia.
2. Aprire il **prototype HTML** della pagina target per layout, spacing, interazioni.
3. Per la Home è disponibile anche uno **spec README** dettagliato (tabella componenti, design tokens, animazioni) — usarlo come checklist.
4. Ricreare nel codebase usando le classi `.gt-*` già esistenti in `app/globals.css`. **Non** copiare React/Babel del prototipo, né caricare font da Google via CDN (i font sono caricati in `app/layout.tsx` via `next/font`).

---

## Convenzione per futuri handoff

Quando arriva un nuovo bundle da Claude Design:

1. Scompattare in `docs/design/<NomePagina>/` (una cartella per handoff).
2. Aggiornare la tabella sopra con: primary prototype, spec (se presente), pagina target.
3. Se il bundle include prototipi per pagine già documentate, referenziare il path senza duplicarli.
4. Aggiornare `DESIGN.md` §8 (file map) solo se cambia la struttura top-level di `docs/design/`.

Non committare `.DS_Store` (già in `.gitignore`).
