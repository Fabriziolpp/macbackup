# fidelity

**Mood:** replica 1:1 della pptx originale + micro-interazioni HTML
**Use case:** quando la pptx è già stata progettata graficamente e vuoi solo trasformarla in deck web interattivo senza alterarne il look

## Due sotto-modalità

### 🅰 SVG (consigliata) — pixel-perfect + animazioni individuali

Ogni slide è un albero vettoriale. Ogni titolo, shape, paragrafo, immagine **è un nodo DOM** → animabile, hoverabile, cliccabile singolarmente.

- ✅ Pixel-perfect (rendering PDF di PowerPoint stesso)
- ✅ Testo selezionabile + accessibile
- ✅ Ogni elemento entra in scena staggered (titolo prima, body dopo, ecc.)
- ✅ Hover effects su shape "hot" (glow + scale)
- ✅ File leggero (~50-300 KB per slide)

**Come ottenere gli SVG:**
1. Dal tuo software (PowerPoint/Keynote/Google Slides) esporta la pptx in **PDF**
2. Converti il PDF in **un SVG per slide**:
   - **Online (più rapido)**: `cloudconvert.com/pdf-to-svg`, `convertio.co/pdf-svg`
   - **Locale (Mac)**: `brew install pdf2svg` → `pdf2svg deck.pdf slide%d.svg all`
   - **Inkscape**: apri PDF, "Save As" SVG per ogni pagina

### 🅱 PNG/JPG (fallback) — animazioni solo a livello slide

Ogni slide è un'immagine raster piatta. Si può animare la slide **come blocco intero** (fade, Ken Burns), ma **non** i suoi contenuti interni.

- ✅ Pixel-perfect
- ❌ Nessuna animazione interna
- ❌ Testo non selezionabile
- ❌ File pesante (~5-20 MB totali)

**Come ottenere PNG:**
- **PowerPoint**: File → Salva con nome → PNG/JPG → "Tutte le slide"
- **Keynote**: File → Esporta → Immagini → PNG qualità massima

## Micro-interazioni applicate (entrambe le sotto-modalità)

- **Nav UI** identica agli altri temi: ← / → / Space / swipe / wheel / dots / progress bar
- **Crossfade smooth** tra slide (350ms)
- **Subtle entry**: scala 0.98→1 + fade
- **Ken Burns** opzionale (per slide marcate `data-kb`): zoom impercettibile durante la sosta
- **Hover-glow** sui dot della nav
- **Fullscreen toggle** con `F`
- **Slide counter + progress bar** in cima

## Extra solo per modalità SVG

- **Stagger entry per-elemento**: titoli, body, shape entrano uno alla volta con rise+fade
- **Hover "hot zones"**: shape marcate (es. icone) brillano al passaggio del mouse
- **Click-to-zoom** opzionale su regioni specifiche (richiede config)

## Workflow di setup (richiesto all'utente)

1. **Esporta le slide come immagini** dal tuo software:
   - **PowerPoint**: File → Esporta → Crea PDF/XPS, poi convertilo in PNG (es. con Preview su Mac, o online); **oppure** File → Salva con nome → Formato JPEG/PNG → "Tutte le slide"
   - **Keynote**: File → Esporta → Immagini → PNG (o JPG, qualità massima)
   - **Google Slides**: File → Scarica → PDF, poi converti in PNG
2. **Risultato atteso**: una cartella con `Slide1.png`, `Slide2.png`, … `SlideN.png` (l'ordine alfabetico del filename determina la sequenza)
3. **Risoluzione consigliata**: minimo 1920×1080 (Full HD). Per stampa-quality, 2880×1620 o superiore.
4. **Formato**: PNG (testo nitido) o JPG qualità alta (file più piccoli, ottimo per foto)

## Micro-interazioni aggiunte

- **Nav UI** identica agli altri temi: ← / → / Space / swipe / wheel / dots / progress bar
- **Crossfade smooth** tra slide (350ms)
- **Subtle entry** sull'attiva: scala 0.98→1 + fade
- **Ken Burns** opzionale (per slide marcate `data-kb`): zoom impercettibile durante la sosta
- **Hover-glow** sui dot della nav
- **Fullscreen toggle** con `F`
- **Slide counter + progress bar** in cima

## Vantaggi
- Pixel-perfect: il deck mostra esattamente quello che hai disegnato nella pptx
- Zero rischi di "AI re-interpreta il design"
- Distribuibile come singolo file HTML (`index.standalone.html` con immagini base64-inlined)

## Limiti
- Testo non selezionabile (è raster)
- File size più grande (somma di tutte le immagini)
- Niente animazioni "dentro" la slide — solo nelle transizioni e overlay
- Non responsive al di sotto della risoluzione originale

## Quando NON usarlo
- Se vuoi un look "premium designed da web" → uno dei 6 temi
- Se la pptx è graficamente povera o piena di placeholder → meglio re-authoring tematico
- Se ti serve testo selezionabile / accessibile → usa un tema vero (o vai con SVG, vedi nota)

## Nota su SVG (avanzato)

Se l'utente esporta in PDF e poi converte in SVG (es. con `pdf2svg` o Inkscape), si possono usare gli SVG al posto dei PNG: testo selezionabile, file più piccoli, scaling perfetto. La skill rileva automaticamente l'estensione: SVG > PNG > JPG.
