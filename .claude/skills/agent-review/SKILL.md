---
description: Review work done by another agent on the current branch and produce objective feedback the user can hand back. Use when the user asks "review the work on this branch", "review what the other agent did", or wants a critical evaluation of changes they did not make themselves.
---

## Context

- Current branch: !`git branch --show-current`
- Commits vs main: !`git log main..HEAD --oneline 2>/dev/null || git log master..HEAD --oneline 2>/dev/null`
- Files changed (3-dot): !`git diff main...HEAD --name-status 2>/dev/null || git diff master...HEAD --name-status 2>/dev/null`

## Goal

Produce a file:line-grounded report the user can paste back to the original agent. Both real issues AND validated good choices belong in the report — corrections-only feedback teaches agents to overcorrect.

## Workflow

### 1. Scope the work before judging anything

**The trap**: `main` may have moved forward since the branch was cut, so a 2-dot `git diff main..HEAD` can show changes the branch did not make. If the 2-dot diff shows substantially more change than the sum of the branch's own commits (`git log main..HEAD`), you're seeing `main`'s drift, not the agent's work.

Always use:

- `git log <base>..HEAD --oneline` — the actual commits on this branch
- `git diff <base>...HEAD` (3-dot) — files this branch changed, excluding files that only moved on main
- `git show <sha> --stat` — per-commit scope

State the real scope back to the user before reviewing: "this branch is N commits / M files / X insertions, all <intent>."

### 2. Read intent before reading code

Read, in order:

- Commit message(s) — what did the agent say they were doing?
- Any changeset or release-note file — what did they tell downstream users?
- Any linked ticket the user mentions — what was actually requested?

You're checking against the agent's _stated intent and the user's actual ask_, not your preferred design.

### 3. Use TaskCreate to organize

For non-trivial reviews, create tasks for each review dimension (read impl, compare to siblings, read tests, verify wiring, run checks). Mark as you go.

### 4. Read implementation files whole, not just diffs

Diffs hide surrounding context. Read each non-trivial new or modified file completely. For state machines, trace every transition by hand against the model, including message orderings you think are obvious.

### 5. Compare against sibling patterns

If the agent added a new component/module, find 1–2 peer files that do the same kind of work. Compare:

- Public API surface — what's exposed, what's hidden
- Naming (messages, commands, types) against project conventions
- Internal structure and layering
- Rules in CLAUDE.md or memory files

Inconsistencies are findings: either the agent missed a convention, or the new code is right and the sibling is stale. Say which.

### 6. Verify, don't trust

Run typecheck + tests + lint (whatever the project uses). Pass ≠ correct, but fail = real signal.

**Tests passing is necessary but not sufficient.** The agent likely wrote the tests too, so passing tests prove the agent's mental model is self-consistent — not that it matches reality. Read the tests and ask: do they cover obvious failure modes, or just happy paths? Do the test names match what the tests actually assert?

### 7. Trace user-facing behavior and edge cases

The bugs the agent's own tests almost never catch:

- Event handling: what fires on click vs. keyboard (e.g., `focus` fires on mouse-click too)
- Event orderings: what if A fires twice? What if B fires before A completes?
- Boundary states: empty/null/initial/post-reset
- ARIA semantics: does the rendered DOM actually announce correctly?
- State machines: every transition from every state, not just the happy path

### 8. Write the report

Structure it for the agent receiving it, not for yourself:

1. **Verdict** — one sentence: ships, ships with fixes, or needs rework
2. **Bugs / behavioral issues** — real problems with `file:line` refs and a fix direction
3. **Naming / convention issues** — project-rule violations; cite the rule when applicable
4. **Design discussion** — non-blocking concerns worth raising for awareness
5. **What's right** — explicit positive feedback. **Load-bearing.** Without this, the agent drifts away from choices you've already validated.
6. **Suggested action before merging** — short prioritization of what's worth fixing now

Every claim cites `file_path:line_number`. No hand-waving like "the state machine is fragile" without pointing at exactly where.

## Anti-patterns

- Don't list every nit — prioritize by user impact and match feedback density to scope
- Don't hallucinate issues by misreading diff context; Read the file when unsure
- Don't approve because tests and typecheck pass — they can't catch design bugs
- Don't pile design opinions onto a one-liner change
- Don't write the report before running the checks; pass/fail signal should inform the verdict
