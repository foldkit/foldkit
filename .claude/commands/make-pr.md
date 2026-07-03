---
description: Take a described change in foldkit/foldkit from idea to a single-commit, review-clean PR that a human then merges. Pass what you want done, e.g. /make-pr fix the flaky canvas test.
---

# Make PR

Take the change described in `$ARGUMENTS` from idea to a single-commit, review-clean pull request. You coordinate: understand what is being asked, delegate the implementation to a subagent, review that work adversarially, iterate to one clean commit with every gate green, and open the PR. You never merge. The maintainer merges.

If `$ARGUMENTS` is empty, ask the maintainer what change they want before doing anything else.

## Hard rules

These never bend. A violation means the work is not done.

- **Never merge.** Do not merge, do not enable auto-merge. Opening the PR is the finish line.
- **One commit.** The branch ends with exactly one commit. Fold every fix and every round of review feedback into it with `git commit --amend`, never a second commit.
- **Branch off latest main.** `git fetch origin main` then `git checkout -B claude/<slug> origin/main`, where `<slug>` is a short kebab-case summary of the change. Never build on another agent's branch.
- **Author identity.** Run `git config user.email noreply@anthropic.com && git config user.name Claude` before committing.
- **No AI attribution in artifacts.** No co-author trailer, no mention of Claude or any model identifier in the commit message, changeset, code comments, or PR title. The PR body ends with the standard Claude Code footer and nothing more.
- **No em dashes** in any prose you write (commit, changeset, PR body, comments). Use a period and a fresh sentence.
- **Scope is `foldkit/foldkit` only.** Use the `mcp__github__*` tools for all GitHub work. There is no `gh` CLI.
- **Read the conventions first.** Root `CLAUDE.md` and `AGENTS.md` govern naming, code style, commit scopes, and changesets. Follow them. The rules below are the workflow, not a substitute for them.

## Workflow

### 1. Understand the change

Investigate before writing anything. Find the relevant files, confirm your understanding of what is being asked, and decide what kind of change it is (bug fix, feature, docs, refactor). Trace history when a "when did this break" question matters. Do not anchor on a squashed import commit as an origin. Check npm or CHANGELOG timelines when the repo history looks collapsed.

If the request is genuinely ambiguous, or architecturally load-bearing, or fights an Elm Architecture or Foldkit principle, stop and ask the maintainer with a crisp recommendation before implementing. Do not open a half-fix or guess at a fork the maintainer should call.

### 2. Branch

Create `claude/<slug>` off latest `origin/main` and set the author identity, as in the hard rules.

### 3. Delegate the implementation

Spawn an implementation subagent with the Agent tool. Give it a thorough brief: the change, what you learned in step 1, the design decision if you made one, and the hard rules above (single commit, branch, author identity, changeset expectations, all gates green, no AI attribution, no em dashes). Tell it to implement, produce one commit on the branch, run the gates, self-review, and report back its rationale and the diff. Tell it NOT to open the PR. You open the PR after you have reviewed.

You may run the implementation inline instead when the change is small and mechanical. The independent review in step 4 still happens either way.

### 4. Review it adversarially

Read the full diff yourself as a hostile reviewer, do not take the implementer's word. Check:

- **Correctness.** Does it actually do what was asked? Construct the failing case and confirm the change handles it. For anything with a runtime surface, exercise it, do not trust a green typecheck. The repo ships a `verify` skill and a `code-review` skill; use them.
- **Scope.** Nothing unrelated. No drive-by edits. The commit describes the whole change set and only it.
- **Conventions.** Naming, code style, keying, state modeling per `CLAUDE.md`. Schema types, `Option`, `Match`, no bracket indexing, no sentinels.
- **Changeset.** Any change to a versioned package (`foldkit`, `@foldkit/ui`, `@foldkit/devtools`, `create-foldkit-app`, `@foldkit/vite-plugin`, `@foldkit/devtools-mcp`) needs a changeset. A test-only or internal change with no user-facing effect uses `pnpm changeset add --empty`. The repo blocks major changesets, so use `minor` or `patch`. A change touching no versioned package needs none.
- **Commit hygiene.** One commit. Conventional Commits with a valid scope that fits the whole diff (package dirs, example dirs, `skills`, `ci`, `release`; omit the scope if none fits, and do not invent broad scopes). `!` after the scope only for a real breaking change. Body lines within the length the commit check enforces.

If you find problems, fix them (directly, or by sending the subagent back) and fold them into the one commit. Loop until the diff is clean.

### 5. Push and open the PR

Push with `git push -u origin claude/<slug>`. The pre-push hook runs the full suite (format, changeset status, lint, dead-code, build, all-package typecheck, test, website e2e) and takes several minutes, so run the push in the background and then confirm the remote ref equals your local HEAD. Retry on network failure up to 4 times with exponential backoff.

Check for a PR template (`.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, root or `docs/PULL_REQUEST_TEMPLATE.md`). If one exists, populate its sections. Otherwise write the body plainly: what the change is and why, what you changed, any design decision and the alternative you rejected, and how you verified. If the change resolves a tracked issue, add `Fixes #<number>.`. End with:

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Report the PR number and URL to the maintainer.

### 6. Iterate on feedback

When the maintainer responds with review feedback, refine on the same branch, amend into the single commit, force-push with `--force-with-lease`, and update the PR body if the change drifted from it. Keep verifying. Keep it one commit. Stop the moment the maintainer says they have merged, or asks you to stop.

## Definition of done

One review-clean commit on `claude/<slug>`, all gates green, remote matching local, an open PR against `main` with an accurate body, correct author identity, and no AI attribution anywhere in the artifacts. Not merged.
