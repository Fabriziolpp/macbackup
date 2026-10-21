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
| `projects/` | `PPTcreator`, `allenamenti-app`, `allenamenti-app copia`, `allenamenti-app backup` (senza `.git`, `node_modules`, `.next`, `.env`) | `~/` |
| `projects/_git-bundles/` | Storia git completa, **inclusi i 3 commit di allenamenti-app non pushati** | `git clone` |
| `scripts/` | `backup.sh`, `scan-secrets.sh`, `excludes.txt` | — |

**Non è nel backup** (di proposito): Desktop, Downloads, `Documents/Sante Data` (dati sanitari, salvati a parte), `OneDrive - Accenture` (già nel cloud), cache (`~/.npm`, `.next`, `node_modules`), skill "synced" (si riscaricano da claude.ai), `~/.claude.json` (stato macchina e login), cronologia della shell, chiave Tanium, **tutti i segreti** (vedi fase 5).

---

## Fase 0 · Prima di formattare (sul Mac vecchio)

1. Aggiorna il backup e controlla che non ci siano segreti:
   ```bash
   cd ~/mac-backup
   bash scripts/backup.sh
   bash scripts/scan-secrets.sh
   git add -A
   git commit -m "Backup finale prima della migrazione"
   git push
   ```
2. **Salva i segreti nel password manager**: non sono su GitHub. Sono elencati nella fase 5:
   - `~/allenamenti-app/config.json` → `anthropicApiKey`
   - `~/allenamenti-app/.env` e `~/allenamenti-app/.env.local` → tutte le variabili
   - `~/allenamenti-app copia/.env`
3. (Consigliato) Pusha i 3 commit di `allenamenti-app` su GitHub: `cd ~/allenamenti-app && git push`. Sono comunque nel bundle.
4. Salva `Documents/Sante Data` su un supporto cifrato o in un cloud personale.
5. Copia questo README su OneDrive.
6. Annota i codici di recupero 2FA di GitHub e del password manager.

---

## Fase 1 · Account

1. Completa la registrazione del Mac aziendale (Intune / Company Portal) con le credenziali Accenture.
2. Apri il **password manager** per primo: tutti i segreti della fase 5 sono lì.
3. Accedi a **github.com nel browser** (Safari o Chrome), con il 2FA. Serve nella fase 3 per scaricare il backup **senza digitare token nel Terminale**.

---

## Fase 2 · Ambiente di base

1. **Command Line Tools** (installano `git`, `python3` e `rsync`):
   ```bash
   xcode-select --install
   ```
   Oppure installa Xcode dall'App Store (prima era installato).
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
mkdir -p ~/.claude/skills ~/.claude/projects
cp claude/settings.json ~/.claude/settings.json
rsync -a claude/skills/ ~/.claude/skills/
rsync -a claude/projects/ ~/.claude/projects/
```
Nota: le cartelle in `claude/projects/` hanno nel nome il percorso del progetto (es. `-Users-fabrizio-lo-presti-allenamenti-app`). Se il nuovo nome utente è diverso, rinominale con il nuovo percorso: i punti e le barre diventano `-`. Altrimenti Claude non trova le memorie.

I plugin (`superpowers@claude-plugins-official`) sono attivati in `settings.json` e si installano al primo avvio, nella fase 6. `claude/plugins/*.json` serve solo come riferimento: non copiarlo, contiene percorsi della vecchia macchina.

### 3.5 Warp e VS Code
```bash
mkdir -p ~/.warp && cp dotfiles/.warp/settings.toml ~/.warp/settings.toml
mkdir -p ~/.vscode && cp dotfiles/.vscode/argv.json ~/.vscode/argv.json
VSU="$HOME/Library/Application Support/Code/User"
mkdir -p "$VSU" && cp dotfiles/vscode-user/settings.json "$VSU/" && rsync -a dotfiles/vscode-user/snippets/ "$VSU/snippets/"
```
Solo ora puoi aprire Warp e VS Code.

---

## Fase 4 · Progetti e documenti

```bash
cd ~/mac-backup-restore
rsync -a "documents/Claude/" ~/Documents/Claude/
rsync -a "documents/Obsidian Vault/" ~/Documents/"Obsidian Vault"/
rsync -a projects/PPTcreator/ ~/PPTcreator/
```

**allenamenti-app.** ⚠️ **ORDINE**: prima il clone dal bundle (storia e commit non pushati), poi i file di lavoro sopra.
```bash
git clone projects/_git-bundles/allenamenti-app.bundle ~/allenamenti-app
cd ~/allenamenti-app
git remote set-url origin https://github.com/Fabriziolpp/allenamenti-app.git
rsync -a ~/mac-backup-restore/projects/allenamenti-app/ ~/allenamenti-app/
git status          # mostra le modifiche non committate che c'erano prima
npm install
cd ~/mac-backup-restore
```

**allenamenti-app copia** (stessa procedura):
```bash
git clone projects/_git-bundles/allenamenti-app-copia.bundle ~/"allenamenti-app copia"
git -C ~/"allenamenti-app copia" remote set-url origin https://github.com/Fabriziolpp/allenamenti-app.git
rsync -a "projects/allenamenti-app copia/" ~/"allenamenti-app copia"/
(cd ~/"allenamenti-app copia" && npm install)
```
Nota: `.claude/worktrees/gallant-cannon` è la copia dei file di un vecchio worktree. Il suo branch non esiste più, quindi è solo un archivio.

**allenamenti-app backup** (non è un repo git):
```bash
rsync -a "projects/allenamenti-app backup/" ~/"allenamenti-app backup"/
(cd ~/"allenamenti-app backup" && npm install)
```

---

## Fase 5 · Segreti

Nessuno di questi file è nel backup. Ricreali dal password manager con un editor (`code <file>` oppure TextEdit), **mai con `echo` nel Terminale**: finirebbero nella cronologia della shell.

| File | Contenuto | Modello |
|---|---|---|
| `~/allenamenti-app/.env` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` | `.env.example` |
| `~/allenamenti-app/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_2_EMAIL`, `TEST_USER_2_PASSWORD` | `.env.example`, `docs/MIGRATION.md` |
| `~/allenamenti-app/config.json` | `{ "anthropicApiKey": "…" }` | — |
| `~/allenamenti-app copia/.env` e `config.json` | come sopra | `.env.example` |
| `~/allenamenti-app backup/config.json` | come sopra | — |

Se non hai salvato un valore: le chiavi Supabase si recuperano dalla dashboard (Project Settings → API), quella Anthropic si rigenera su console.anthropic.com (poi revoca la vecchia).
Proteggi i file: `chmod 600 ~/allenamenti-app/.env ~/allenamenti-app/.env.local ~/allenamenti-app/config.json`

---

## Fase 6 · Login ai servizi

⚠️ **ORDINE**: solo dopo le fasi 3–5.

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
   rm -rf ~/mac-backup-restore ~/Downloads/macbackup-main.zip
   ```
3. **Claude Code** (dopo la 3.4):
   ```bash
   cd ~ && claude
   ```
   Esegui `/login`, poi controlla `/plugin` (se superpowers non c'è: `/plugin install superpowers@claude-plugins-official`) e `/skills`.
4. **App Claude** (desktop): login. Le skill "synced" e i connettori si riattivano dall'account claude.ai.
5. Le altre app: Teams/Outlook/OneDrive (SSO Accenture), GlobalProtect, Chrome (sync), VS Code (Settings Sync / Copilot), Evernote, Raindrop.io, Kindle, Spotify, Zoom.

---

## Fase 7 · Verifica finale

```bash
git config --global user.name && git config --global user.email
gh auth status
node -v                                   # v24.14.0
claude --version
ls ~/.claude/skills                       # Skill_ppt_deck_generator  acnpptx  handoff
ls ~/.claude/projects/*/memory
cd ~/allenamenti-app && git log --oneline -4 && git status -sb   # i 3 commit sono presenti
ls -la .env .env.local config.json        # esistono, permessi -rw-------
npm run dev                               # l'app parte e si collega a Supabase
```
- [ ] In Claude Code: `/skills` mostra le 3 skill, `/plugin` mostra superpowers, e le memorie del progetto vengono richiamate.
- [ ] Obsidian apre `~/Documents/Obsidian Vault`.
- [ ] VS Code e Warp hanno le impostazioni di prima.
- [ ] `cd ~/mac-backup && bash scripts/backup.sh && git status` gira senza errori: il backup funziona anche dal nuovo Mac.

---

## Aggiornare il backup in futuro
```bash
cd ~/mac-backup
bash scripts/backup.sh
bash scripts/scan-secrets.sh    # deve dire "Nessun segreto trovato."
git add -A && git commit -m "Backup $(date +%F)" && git push
```
