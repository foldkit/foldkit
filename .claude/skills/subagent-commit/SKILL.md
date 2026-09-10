---
allowed-tools: Bash(git:*), Agent
description: Land all branch work — committed + uncommitted — as one tidy commit on top of fresh main, via a sub-agent so the parent conversation's context does not pollute the commit message. Fetches origin/main, rebases, soft-resets, delegates `/commit`.
---

## Context

- Current branch: !`git branch --show-current`
- Working tree: !`git status --short`
- Commits ahead of main: !`git log main..HEAD --oneline 2>/dev/null`

## Your task

Produce exactly one Conventional-Commits commit on top of the latest `main` containing every change currently on this branch (existing commits plus any uncommitted edits). The commit message itself must be written by a fresh sub-agent — your job is to set up clean state and delegate, not to write the message.

### 1. Pre-flight checks

Refuse and exit early if any of these are true:

- The current branch IS `main` (or `master`). Tell the user to switch first.
- A rebase/merge/cherry-pick is already in progress (check `.git/MERGE_HEAD`, `.git/rebase-merge/`, `.git/rebase-apply/`).
- There are zero commits ahead of main AND a clean working tree (nothing to commit).

Note for later steps whether the working tree is dirty.

### 2. Stash uncommitted changes (if any)

If `git status --short` shows anything:

```
git stash push --include-untracked --message "subagent-commit-pending"
```

Otherwise skip.

### 3. Fetch and fast-forward local main

```
git fetch origin
git fetch origin main:main
```

The second command fast-forwards local `main` to match `origin/main` without checking it out. If it fails because local `main` has diverged from `origin/main`, STOP:

- Pop the stash if you pushed one.
- Tell the user: "Local `main` has diverged from `origin/main`. Resolve it (rebase your local main, or reset --hard origin/main if it's safe to discard), then re-run `/subagent-commit`."
- Do not try to auto-resolve.

### 4. Rebase onto main

```
git rebase main
```

If the rebase produces conflicts:

- Run `git rebase --abort` to clean up.
- Pop the stash if you pushed one.
- STOP and report: "Rebase onto main produced conflicts in: <list of files>. Resolve them on the branch normally (your usual rebase flow), then re-run `/subagent-commit`."
- NEVER resolve rebase conflicts yourself — that's outside this skill's contract.

### 5. Pop the stash (if you pushed one)

```
git stash pop
```

If popping conflicts (very rare — same file edited on main and in stash), STOP and tell the user. Do not try to auto-resolve.

### 6. Soft-reset to main

After rebase, `merge-base(HEAD, main)` is `main` itself, so:

```
git reset --soft main
```

All branch work is now staged as one big change, with HEAD at `main`.

### 7. Sanity-check the staged diff

```
git diff --cached --stat
git status --short
```

The diff should contain only the changes the user expects. If you see unfamiliar deletions, files outside the branch's apparent scope, or anything that looks like a revert of recent main commits, STOP and report what you see. Do NOT commit. The most common cause is a partial rebase or a stash pop that didn't unwind cleanly.

### 8. Delegate the commit to a sub-agent

Use the Agent tool with `subagent_type: "general-purpose"`. The prompt should be self-contained — the sub-agent will not see this conversation. Tell it:

- Repo path (the absolute path to the working directory).
- Branch name.
- That all changes are already staged.
- That it should read this repo's CLAUDE.md (if present) before composing the commit, so it respects local conventions (Conventional Commits scopes, no Co-Authored-By, no Claude mentions, etc.).
- That it must invoke the `/commit` skill via the Skill tool — not write the commit by hand.
- That ONE commit is required. If `/commit` suggests splitting, push back.
- That it must NOT push, force, amend, or use `--no-verify`.
- That on success it should run `git log main..HEAD --oneline` and `git status`, then report under 100 words: the new commit SHA + subject and a clean-tree confirmation.

Pass the relevant context but NOT the parent conversation's design discussion or back-and-forth.

### 9. Verify and report

After the sub-agent returns:

```
git log main..HEAD --oneline
git status
```

There should be exactly one commit ahead of `main` and a clean working tree. Report the commit's SHA and subject to the user, plus a one-line note that the local branch has diverged from `origin/<branch>` (if applicable) and is not pushed.

## Hard rules

- Never push.
- Never `--force`, `--no-verify`, or amend.
- Never resolve rebase or stash conflicts yourself.
- Never commit yourself — always delegate to the sub-agent so the message is clean.
- On any failure, leave the working tree in a recoverable state (pop the stash, abort the rebase) before exiting.
