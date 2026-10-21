---
name: handoff
description: Create a handoff document that compacts the current conversation into a self-contained brief so a fresh agent — in a new session, chat, or context window — can continue the work without re-deriving everything. Use this whenever the user is running low on context or asks to "hand off", "handover", "pass this to another agent/session", "continue this tomorrow/later", "pick up where we left off", "summarize where we are so someone can take over", or is about to clear/compact a long conversation. Also reach for it proactively when a long, unfinished task is being interrupted and will resume elsewhere. Triggers on "handoff", "handover", "context is full/almost full", "new session", "resume later".
---

A fresh agent will read this document with **zero** memory of the conversation. Your job is to give it everything it needs to continue the work — and *nothing it can get elsewhere*. A good handoff is compact but actionable: someone should be able to act from it without replaying the whole conversation, yet it must not just transcribe what's already in the repo, the plan, or the diffs. If the handoff is as long as re-reading the conversation, it has failed.

Write the document in the working language of the conversation (match the user) — translate the section headings too when that language isn't Italian. The structure below is the stable scaffold: keep the sections and their order, adapt only the language of the labels.

## Output structure

Fill every section. If one genuinely doesn't apply, write "—" rather than padding it.

```
# Handoff: <short title of the work>

## Obiettivo
The north-star goal — what does "done" look like? One or two sentences. This orients everything below.

## Stato attuale
Where things stand right now: what works, what's half-built, what's blocked. This is the continuer's starting line.

## Fatto
Key changes and decisions already made. Reference artifacts by path/URL instead of reproducing them. Bullet the decisions that would be expensive to rediscover.

## Prossimi passi
Concrete, ordered next actions — the most valuable section. Each item actionable on its own ("run X", "fix Y in file Z:line", "ask the user about W"), never vague ("continue the work").

## File & comandi chiave
The handful of paths the continuer will touch, plus how to build / test / run / verify. Save them the search.

## Gotcha & decisioni
Non-obvious things: dead ends already tried (so they aren't repeated), constraints, why a non-obvious choice was made, sharp edges. This is where hard-won knowledge transfers.

## Skill suggerite
Which skills the next agent should invoke to continue, and when. If none, write "—".
```

## Principles

**Reference, don't duplicate.** If something already lives in a PRD, plan, ADR, issue, commit, or diff, link it by path or URL — don't paste it. Duplicated content goes stale and bloats the handoff until it's no shorter than the thing it summarizes, defeating the purpose.

**Lead with what the continuer needs.** They care most about the goal and the next steps. Weight the document accordingly — don't bury the next action under a wall of history.

**Redact secrets.** Strip API keys, tokens, passwords, connection strings, and PII before writing. A handoff may be saved to disk or pasted into another tool, so treat it as potentially shared — replace secrets with a placeholder like `<REDACTED: DB password>` and say where the real value lives (env var, secret manager).

**Tailor to the next session's focus.** If the user passed an argument describing what the next session is for, bias the document toward it — surface the state and next steps relevant to *that* focus and trim the rest. The argument is the lens, not a new task.

## Saving

Save the document to the OS temporary directory (`$TMPDIR` on macOS, `/tmp` on Linux) — **not** the current workspace, since it's a transient artifact that shouldn't clutter the repo. Name it descriptively, e.g. `handoff-<topic>-<YYYY-MM-DD>.md`. After saving, print the absolute path and tell the user to give that file to the next agent. If the user asks for a different location, honor it.
