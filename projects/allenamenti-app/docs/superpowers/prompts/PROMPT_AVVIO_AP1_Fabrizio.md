# AP1 — Prompt di avvio conversione (per Fabrizio)

> **Cos'è questo file.** Il prompt preciso per far partire la conversione di **Vi.To** da
> web app (WebView remota) a **vera app nativa iOS + Android** (feature AP1).
> L'analisi, le decisioni e il piano operativo sono già stati prodotti e vivono in questa
> stessa cartella `docs/` (vedi §Documenti di riferimento). Questo prompt li mette in mano
> a un agente di coding per iniziare.

---

## Come usarlo

1. Apri **il repository** in Cursor / Claude Code (con questa cartella `docs/` inclusa).
2. Assicurati che i **prerequisiti** qui sotto siano pronti.
3. Incolla il **blocco PROMPT** qui sotto nell'agente e lascialo eseguire la **Fase 0**.
4. Alla fine della Fase 0 l'agente si ferma e ti presenta i *findings*: da lì si decide
   l'ordine delle Fasi successive (2–6).

---

## Prerequisiti (da avere pronti prima di incollare il prompt)

- [ ] **Repository** clonato e apribile nell'agente.
- [ ] **Variabili d'ambiente Supabase** presenti in locale (URL + anon key) per far girare `npm run dev`. Project ref: `lzwyhokkvzxlnubsenmf`.
- [ ] **Node + npm** installati; il progetto builda (`npm install` ok).
- [ ] **Android Studio + Android SDK** installati (servono per verificare `cap add android`). Se non ci sono, l'agente lo annota come prerequisito e prosegue — non è un blocco.
- [ ] **Account Apple Developer** in apertura (serve dopo, per TestFlight — non per la Fase 0).
- [ ] Nessuna modifica su `main`/produzione: l'agente lavora su branch `ap1/fase0-spike`.

---

## Documenti di riferimento (già in `docs/`)

| Documento | Cosa contiene |
|---|---|
| `docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md` | **Spec di design AP1** — architettura target (Strada B), 7 fasi, decisioni prese, rischi. **Fonte di verità.** |
| `docs/superpowers/plans/2026-07-21-ap1-fase0-setup-export-spike.md` | **Piano Fase 0** — 5 task eseguibili passo-passo (setup, inventario, spike export, Android, findings). |
| `docs/STACK_MOBILE_analisi_locale.md` | Analisi tecnica dello stack e del passaggio a mobile. |
| `docs/BACKLOG.md` | Backlog di prodotto (priorità, feature, completati). |
| `docs/Vito_guida_AP1_backlog.docx` | Guida di onboarding in linguaggio semplice. |

---

## ⬇️ BLOCCO PROMPT — incolla questo nell'agente

```text
Sei un ingegnere che avvia la conversione dell'app "Vi.To" (repo attuale, brand "ALLENAMENTI")
da web app servita in WebView remota a VERA app nativa iOS + Android (feature "AP1").

PRIMA DI TOCCARE QUALSIASI COSA, leggi in quest'ordine:
1. docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md   (spec di design — fonte di verità)
2. docs/superpowers/plans/2026-07-21-ap1-fase0-setup-export-spike.md   (il piano che eseguirai ora)
3. docs/STACK_MOBILE_analisi_locale.md   (contesto tecnico)
4. docs/BACKLOG.md   (contesto di prodotto)

DECISIONI GIÀ PRESE — NON rimetterle in discussione, costruisci su queste:
- Architettura target = "Strada B": bundle statico locale (Next `output:'export'`) + client
  che parla DIRETTO con Supabase (la RLS è la guardia). NON la WebView remota attuale.
- Target cross-platform da giorno 1: iOS + Android. iOS è il primo canale (TestFlight).
- La chiave Anthropic NON deve MAI finire nel bundle nativo (vincolo assoluto): le route AI
  (import-pdf, motivation) vanno su Supabase Edge Function.
- Libreria offline = `idb` (NON Dexie). Le 14 route CRUD "thin" andranno migrate a
  supabase-js diretto; `server.js` (Express legacy) va dismesso.

COSA DEVI FARE ORA (solo la Fase 0):
Esegui il piano docs/superpowers/plans/2026-07-21-ap1-fase0-setup-export-spike.md
task per task, dal Task 1 al Task 5, seguendo i singoli step (checkbox `- [ ]`).
Regole di esecuzione:
- Lavora sul branch `ap1/fase0-spike`. NON modificare `main`.
- Dopo ogni step verifica l'esito reale (build/log/comando) prima di procedere; committa spesso
  con messaggi chiari come indicato nel piano.
- Il momento chiave è il Task 3 (spike `output:'export'`): registra gli errori REALI dal log,
  non quelli che ti aspetti. Classifica ogni bloccante e la fase che lo risolve.
- Produci i tre artefatti di note previsti dal piano:
  docs/superpowers/notes/ap1-fase0-inventory.md,
  docs/superpowers/notes/ap1-fase0-export-spike.md,
  docs/superpowers/notes/ap1-fase0-findings.md

QUANDO HAI FINITO LA FASE 0, FERMATI e presentami:
- L'esito dello spike export (la SPA regge `output:'export'`? con quali bloccanti?).
- L'ordine consigliato dei piani per le Fasi 2–6 (tipicamente: prima la migrazione del data
  layer, poi l'export pulito), come scritto in ap1-fase0-findings.md.
NON procedere alle Fasi 2–6 senza mia conferma: quei piani si scrivono dopo i findings di Fase 0.
```

---

## Cosa aspettarsi come output della Fase 0

Alla fine l'agente avrà prodotto, sul branch `ap1/fase0-spike`:
- `docs/superpowers/notes/ap1-fase0-inventory.md` — inventario reale (pagine, route API, moduli lib, stato native/PWA).
- `docs/superpowers/notes/ap1-fase0-export-spike.md` — verdetto sullo static export + bloccanti.
- `docs/superpowers/notes/ap1-fase0-findings.md` — sintesi decisionale + ordine dei piani successivi.

**Il gate più importante:** lo spike di static export. Ipotesi tecnica da confermare sul log
reale — `output:'export'` fallirà probabilmente sulle 16 route API (i route handler non sono
esportabili staticamente). Se è così NON è un problema: è ciò che la Fase 2 risolve (migrazione
route → supabase-js + Edge Function), e l'ordine reale diventerà "prima il data layer, poi
l'export pulito". I findings di Fase 0 lo fisseranno con i dati veri.

---

*Preparato il 2026-07-21 come innesco della Fase 0 di AP1. Riferimento: spec di design
`docs/superpowers/specs/2026-07-21-ap1-mobile-native-design.md`.*
