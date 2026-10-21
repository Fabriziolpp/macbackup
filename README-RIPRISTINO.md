# Ripristino del Mac dopo la migrazione

Backup creato il 21/10/2026 dal Mac `fabrizio.lo.presti` (macOS 26.6.2).
Repo privato: `https://github.com/Fabriziolpp/macbackup` · Una copia di questo file è su OneDrive.

Le istruzioni funzionano **a mano, dal Terminale**: all'inizio Claude Code non è installato.
Esegui le fasi **nell'ordine indicato**. Dove l'ordine conta trovi **⚠️ ORDINE**.

Regole (Defender è attivo): niente `curl … | bash`, niente codice codificato o offuscato passato a un interprete, nessuna password o token negli argomenti dei comandi o negli URL. I token si inseriscono solo nei prompt interattivi o nel browser.

---

## Cosa contiene il backup

| Cartella | Contenuto | Torna in |
|---|---|---|
| `claude/settings.json` | Impostazioni globali di Claude Code (modello, tema, plugin attivi) | `~/.claude/settings.json` |
| `claude/skills/` | Skill personali: `Skill_ppt_deck_generator`, `acnpptx`, `handoff` | `~/.claude/skills/` |
| `claude/projects/*/memory/` | Memorie di Claude per progetto | `~/.claude/projects/*/memory/` |
| `claude/plugins/` | Elenco dei plugin e dei marketplace, solo come riferimento | non si copia, si reinstalla |
| `dotfiles/` | `.zshrc`, `.config/git/ignore`, Warp, VS Code (`settings.json`, snippets, `argv.json`) | `~/…` |
| `apps/` | Elenco app, estensioni VS Code, versioni di Node e pacchetti npm globali | reinstallazione |
| `documents/` | `Claude/`, `Obsidian Vault/` | `~/Documents/` |
| `projects/PPTcreator` | Progetto PPTcreator | `~/PPTcreator` |
| `projects/allenamenti-app` | Copia dei file di lavoro, inclusi quelli che il `.gitignore` tiene fuori da GitHub (`data.json`, `backups/`, alcuni `docs/`, `.claude/settings*.json`, file iOS di Capacitor) | si clona da GitHub e poi si copia questa sopra (fase 6) |
| `projects/allenamenti-app copia`, `… backup` | Vecchie versioni Express: **solo archivio** | non serve ripristinarle |
| `projects/_git-bundles/` | Storia git completa di allenamenti-app: **copia di sicurezza** se GitHub non fosse raggiungibile | — |
| `scripts/` | `backup.sh`, `scan-secrets.sh`, `publish.sh`, `excludes.txt` | — |

**Non è nel backup** (di proposito): Desktop, Downloads, `Documents/Sante Data` (dati sanitari, salvati a parte), `OneDrive - Accenture` (già nel cloud), cache (`~/.npm`, `.next`, `node_modules`), skill "synced" (si riscaricano da claude.ai), `~/.claude.json` (stato macchina e login), cronologia della shell, chiave Tanium, **segreti**: l'unico che serve è `.env.local` di allenamenti-app (fase 0 e fase 6).

---

## Fase 0 · Prima di formattare (sul Mac vecchio)

1. Aggiorna il backup e controlla che non ci siano segreti:
   ```bash
   cd ~/mac-backup
   bash scripts/backup.sh
   bash scripts/publish.sh "Backup finale prima della migrazione"
   ```
   `publish.sh` esegue lo scanner dei segreti e si ferma se trova qualcosa. ⚠️ Non usare un semplice `git add -A`: git scarterebbe i file elencati nei `.gitignore` dei progetti, come `data.json` e `backups/` di allenamenti-app.
2. Controlla che `allenamenti-app` sia tutto su GitHub:
   ```bash
   cd ~/allenamenti-app && git fetch && git status -sb
   ```
   La prima riga deve essere `## main...origin/main` senza `[ahead N]`. Se c'è `ahead`, esegui `git push`. (Al 21/10/2026 era già allineato.)
3. **Salva `~/allenamenti-app/.env.local` nel password manager.** È l'unico segreto che serve: l'app Next usa solo questo file, e `.env` e `config.json` contengono gli stessi valori. Il file ha 7 righe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_2_EMAIL`, `TEST_USER_2_PASSWORD`.
   ```bash
   open -e ~/allenamenti-app/.env.local
   ```
   ⌘A, ⌘C, poi incolla nel campo Note di una voce "allenamenti-app .env.local" in un password manager **personale** (app Password di Apple sull'iPhone, oppure Bitwarden): il portachiavi di questo Mac verrà cancellato. Chiudi TextEdit **senza salvare**.
4. Salva `Documents/Sante Data` su un supporto cifrato o in un cloud personale.
5. Copia questo README su OneDrive.
6. Annota i codici di recupero 2FA di GitHub e del password manager.

---

## Fase 1 · Account

1. Completa la registrazione del Mac aziendale (Intune / Company Portal) con le credenziali Accenture.
2. Apri il **password manager**: ti servirà nella fase 6 per `.env.local`.
3. Accedi a **github.com nel browser** (Safari o Chrome), con il 2FA. Serve nella fase 3 per scaricare il backup **senza digitare token nel Terminale**.

---

## Fase 2 · Ambiente di base

1. **Command Line Tools** (installano `git`, `python3` e `rsync`):
   ```bash
   xcode-select --install
   ```
   Oppure installa Xcode dall'App Store (prima era installato; serve per la parte iOS di allenamenti-app).
2. **Homebrew** con il pacchetto `.pkg` ufficiale (non lo script `curl | bash`): scarica l'ultimo `Homebrew-x.y.z.pkg` da https://github.com/Homebrew/brew/releases e installalo con doppio clic. Poi:
   ```bash
   echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
   eval "$(/opt/homebrew/bin/brew shellenv)"
   brew --version
   ```
3. **GitHub CLI** (installala, ma **non fare ancora il login**):
   ```bash
   brew install gh
   ```
4. **nvm + Node** con installazione manuale tramite git (è il metodo documentato da nvm, senza `curl | bash`). Il percorso `~/.nvm` è quello che si aspetta il `.zshrc` salvato:
   ```bash
   git clone https://github.com/nvm-sh/nvm.git ~/.nvm
   cd ~/.nvm && git checkout "$(git describe --abbrev=0 --tags)" && cd ~
   ```
   Node si installa nella fase 3, dopo aver ripristinato `.zshrc`.
5. **App**: vedi `apps/applications.txt` e `apps/user-applications.txt`.
   - App aziendali (Office, Teams, Outlook, OneDrive, Defender, GlobalProtect, Zoom, Copilot, Pharos Print, my Accenture Mac, PrivilegeManagement): **Company Portal**.
   - Personali: Claude (claude.ai/download), Chrome, VS Code, Warp, Evernote, Raindrop.io, Kindle, LibreOffice, Spotify, Sante DICOM Viewer Lite: dai siti ufficiali o dall'App Store. Pages e Xcode: App Store.
   - **Non aprire ancora Claude né VS Code** (vedi fase 3).

---

## Fase 3 · Configurazione

> ⚠️ **ORDINE**: questa fase va fatta **prima di aprire Claude Code o l'app Claude** e **prima di `gh auth login`**.
> - Claude Code al primo avvio crea un `~/.claude/settings.json` vuoto e parte senza skill né plugin: se lo apri prima, la configurazione salvata non viene applicata finché non la sovrascrivi e lo riavvii.
> - `gh auth login` scrive in `~/.gitconfig` il credential helper: se ripristini o modifichi la configurazione git **dopo**, rischi di perderlo e gh smette di funzionare con git.

### 3.1 Scarica il backup senza token nel Terminale
Nel browser, già loggato su GitHub: `https://github.com/Fabriziolpp/macbackup` → **Code → Download ZIP**. Poi:
```bash
cd ~/Downloads
unzip -q macbackup-main.zip
mv macbackup-main ~/mac-backup-restore
cd ~/mac-backup-restore
```
(Se il nome utente del nuovo Mac non è `fabrizio.lo.presti`, vedi la nota al punto 3.4.)

### 3.2 Shell e git
```bash
cp dotfiles/.zshrc ~/.zshrc
mkdir -p ~/.config/git && cp dotfiles/.config/git/ignore ~/.config/git/ignore
git config --global user.name "Fabrizio Lo Presti"
git config --global user.email "fabrizio.lopresti@gmail.com"
git config --global init.defaultBranch main
exec zsh
```
Ora installa Node (versione in `apps/node-versions.txt`):
```bash
nvm install 24.14.0
nvm alias default 24.14.0
node -v
```

### 3.3 Claude Code: installazione, senza aprirlo
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```
(`apps/npm-globals.txt` mostra che prima era installato via npm.) **Non eseguire ancora `claude` senza argomenti.**

### 3.4 Configurazione di Claude
```bash
cd ~/mac-backup-restore
mkdir -p ~/.claude/skills ~/.claude/projects
cp claude/settings.json ~/.claude/settings.json
rsync -a claude/skills/ ~/.claude/skills/
rsync -a claude/projects/ ~/.claude/projects/
```
Nota: le cartelle in `claude/projects/` hanno nel nome il percorso del progetto (es. `-Users-fabrizio-lo-presti-allenamenti-app`). Se il nuovo nome utente è diverso, rinominale con il nuovo percorso: i punti e le barre diventano `-`. Altrimenti Claude non trova le memorie.

I plugin (`superpowers@claude-plugins-official`) sono attivati in `settings.json` e si installano al primo avvio, nella fase 5. `claude/plugins/*.json` serve solo come riferimento: non copiarlo, contiene percorsi della vecchia macchina.

### 3.5 Warp e VS Code
```bash
mkdir -p ~/.warp && cp dotfiles/.warp/settings.toml ~/.warp/settings.toml
mkdir -p ~/.vscode && cp dotfiles/.vscode/argv.json ~/.vscode/argv.json
VSU="$HOME/Library/Application Support/Code/User"
mkdir -p "$VSU" && cp dotfiles/vscode-user/settings.json "$VSU/" && rsync -a dotfiles/vscode-user/snippets/ "$VSU/snippets/"
```
Solo ora puoi aprire Warp e VS Code.

---

## Fase 4 · Documenti e PPTcreator

```bash
cd ~/mac-backup-restore
rsync -a "documents/Claude/" ~/Documents/Claude/
rsync -a "documents/Obsidian Vault/" ~/Documents/"Obsidian Vault"/
rsync -a projects/PPTcreator/ ~/PPTcreator/
```
`allenamenti-app` si ripristina nella fase 6: il suo repo GitHub è privato, quindi serve prima il login con `gh`.

---

## Fase 5 · Login ai servizi

⚠️ **ORDINE**: solo dopo la fase 3.

1. **GitHub CLI** (dopo la configurazione git della 3.2):
   ```bash
   gh auth login        # GitHub.com → HTTPS → Login with a web browser
   gh auth setup-git
   gh auth status
   ```
   Il codice si inserisce nel browser, nessun token nel Terminale.
2. **Repo di backup come repo git** (per gli aggiornamenti futuri):
   ```bash
   gh repo clone Fabriziolpp/macbackup ~/mac-backup
   ```
3. **Claude Code** (dopo la 3.4):
   ```bash
   cd ~ && claude
   ```
   Esegui `/login`, poi controlla `/plugin` (se superpowers non c'è: `/plugin install superpowers@claude-plugins-official`) e `/skills`. Esci con `/exit`.
4. **App Claude** (desktop): login. Le skill "synced" e i connettori si riattivano dall'account claude.ai.
5. Le altre app: Teams/Outlook/OneDrive (SSO Accenture), GlobalProtect, Chrome (sync), VS Code (Settings Sync / Copilot), Evernote, Raindrop.io, Kindle, Spotify, Zoom.

---

## Fase 6 · allenamenti-app: riprendere il lavoro

⚠️ **ORDINE**: dopo `gh auth login` (5.1), perché il repo è privato. Clonalo **esattamente in `~/allenamenti-app`**: le memorie di Claude ripristinate nella 3.4 sono legate a quel percorso.

Supabase (database e utenti) e Vercel (deploy) sono nel cloud: la migrazione non li tocca.

1. **Codice da GitHub**:
   ```bash
   gh repo clone Fabriziolpp/allenamenti-app ~/allenamenti-app
   cd ~/allenamenti-app
   ```
2. **File che non sono su GitHub**, presi dal backup. Il `.gitignore` del progetto ne esclude parecchi: `data.json`, `backups/`, `docs/HANDOFF.md`, `docs/conversione_app/`, `STACK_MOBILE_analisi_locale.md`, `.claude/settings*.json` e i file iOS di Capacitor. Si copia sopra il clone l'intera copia di lavoro salvata: GitHub era allineato al backup, quindi il risultato è esattamente lo stato di prima, modifiche non committate comprese.
   ```bash
   rsync -a --exclude=.gitkeep ~/mac-backup/projects/allenamenti-app/ ~/allenamenti-app/
   cp ~/mac-backup/projects/_git-bundles/allenamenti-app.info-exclude ~/allenamenti-app/.git/info/exclude
   git status -sb      # ## main...origin/main, più le stesse modifiche locali di prima
   ```
   Il secondo comando ripristina le esclusioni solo locali (`.git/info/exclude`), che non viaggiano con GitHub: senza, `STACK_MOBILE_analisi_locale.md` e `docs/conversione_app/` comparirebbero tra i file da committare.
3. **Segreti: `.env.local`** (unico file da ricreare). Usa TextEdit, **mai `echo` nel Terminale**, altrimenti i valori finirebbero nella cronologia della shell:
   ```bash
   touch .env.local && chmod 600 .env.local && open -e .env.local
   ```
   Incolla il testo salvato nel password manager (7 righe, vedi fase 0.3), salva e chiudi. Il modello con i nomi delle variabili è in `.env.example`.
   Se non hai salvato i valori: URL e chiave anon di Supabase → dashboard Supabase, Project Settings → API; chiave Anthropic → creane una nuova su console.anthropic.com e revoca la vecchia; password degli utenti di test → reimpostale da Supabase, Authentication → Users.
4. **Dipendenze e avvio**:
   ```bash
   npm install
   npm run dev          # http://localhost:3000
   ```
5. **Test** (usano gli utenti di test di `.env.local`):
   ```bash
   npm test
   npm run test:rls
   ```
6. **Claude Code nel progetto**:
   ```bash
   cd ~/allenamenti-app && claude
   ```
   Claude ritrova le memorie del progetto. Il punto in cui eri rimasto è in `docs/BACKLOG.md` e `docs/HANDOFF.md`.

Se GitHub non fosse raggiungibile, la storia completa è anche nel bundle: `git clone ~/mac-backup/projects/_git-bundles/allenamenti-app.bundle ~/allenamenti-app`, poi `git -C ~/allenamenti-app remote set-url origin https://github.com/Fabriziolpp/allenamenti-app.git`, e poi i passi 2–6.

---

## Fase 7 · Verifica finale

```bash
git config --global user.name && git config --global user.email
gh auth status
node -v                                   # v24.14.0
claude --version
ls ~/.claude/skills                       # Skill_ppt_deck_generator  acnpptx  handoff
ls ~/.claude/projects/*/memory
cd ~/allenamenti-app && git status -sb    # ## main...origin/main
ls -la .env.local                         # esiste, permessi -rw-------
npm run dev                               # l'app parte e si collega a Supabase
```
- [ ] In Claude Code: `/skills` mostra le 3 skill, `/plugin` mostra superpowers, e in `~/allenamenti-app` le memorie del progetto vengono richiamate.
- [ ] Obsidian apre `~/Documents/Obsidian Vault`.
- [ ] VS Code e Warp hanno le impostazioni di prima.
- [ ] `cd ~/mac-backup && bash scripts/backup.sh && git status` gira senza errori: il backup funziona anche dal nuovo Mac.
- [ ] Fatto tutto: elimina la copia temporanea con `rm -rf ~/mac-backup-restore ~/Downloads/macbackup-main.zip`.

---

## Aggiornare il backup in futuro
```bash
cd ~/mac-backup
bash scripts/backup.sh
bash scripts/publish.sh         # scanner dei segreti + commit + push
```
