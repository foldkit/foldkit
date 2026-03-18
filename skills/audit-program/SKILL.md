---
name: audit-program
description: Audit a Foldkit program for architectural correctness, naming conventions, Effect-TS idioms, and common mistakes. Use when the user wants a code review, audit, health check, or says things like "audit my app", "review this program", or "check for issues".
argument-hint: [path to src/ directory, or omit to audit the current project]
---

Audit a Foldkit program for correctness, idiomatic patterns, and architectural health.

**Target: $ARGUMENTS**

## Phase 1: Discover the Program

Locate the source files to audit. If the user provided a path, use it. Otherwise, look for `src/main.ts` in the current working directory.

Read every source file in the program — `main.ts`, `model.ts`, `message.ts`, `command.ts`, `route.ts`, `view.ts`, and any submodel directories under `page/` or `feature/`. Read all of them before proceeding. You need the full picture.

Determine the program's complexity tier:

| Tier | Signals |
|------|---------|
| 1-2 | Single file, no async, no routing |
| 3 | Has `command.ts` or async operations |
| 4-5 | Has routing, multiple domain entities |
| 6-7 | Has submodel directories, OutMessage, managed resources |

Present a brief summary: files found, estimated tier, and what the program does. Then proceed to the audit.

## Phase 2: Read the Reference Guides

Read the architecture and conventions guides to calibrate your audit against the canonical rules:

- [Architecture guide](${CLAUDE_SKILL_DIR}/../generate-program/architecture.md) — TEA structure, invariants, submodels, subscriptions
- [Conventions guide](${CLAUDE_SKILL_DIR}/../generate-program/conventions.md) — naming, Effect-TS patterns, code style

Then read at least one example at the program's complexity tier to establish a quality baseline:

- Tier 1: `${CLAUDE_SKILL_DIR}/../../examples/counter/src/main.ts`
- Tier 2: `${CLAUDE_SKILL_DIR}/../../examples/todo/src/main.ts`
- Tier 3: `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.ts`
- Tier 4: `${CLAUDE_SKILL_DIR}/../../examples/routing/src/main.ts`
- Tier 5: `${CLAUDE_SKILL_DIR}/../../examples/shopping-cart/src/main.ts`
- Tier 6: `${CLAUDE_SKILL_DIR}/../../examples/auth/src/main.ts`
- Tier 7: `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/main.ts`

## Phase 3: Run the Audit

Work through the [audit checklist](checklist.md) category by category. For each check:

1. **Examine** the relevant code
2. **Determine** pass or fail
3. **Record** the specific location and issue if it fails

Do not skip categories — even if the program looks clean, verify each check explicitly. Silent assumptions miss real bugs.

### Calibrate to the tier

Not every check applies to every program:

- **Tier 1-2**: Skip Submodels & OutMessage, Subscriptions & Resources, Route checks
- **Tier 3**: Skip Submodels & OutMessage, Route checks
- **Tier 4-5**: Skip Submodels & OutMessage (unless submodels are present)
- **Tier 6-7**: All checks apply

Mark skipped categories as "N/A — below tier threshold" rather than passing them silently.

## Phase 4: Run Type Checking

Run `npx tsc --noEmit` in the program's project directory. Type errors are audit failures — record them in a separate "Type Errors" section.

## Phase 5: Report

Present the audit as a structured report with these sections:

### Summary

One paragraph: what the program does, its tier, and the overall verdict (clean / minor issues / significant issues / architectural problems).

### Findings

Group findings by category (matching the checklist sections). For each category:

- **Status**: Pass, Fail, or N/A
- **Issues** (if any): Each issue includes:
  - The file and line number
  - What's wrong
  - The fix (show the corrected code inline)

Order categories so failures appear first — the user should see problems before confirmations.

### Scorecard

A compact table summarizing pass/fail/N/A by category:

```
| Category                   | Status |
|----------------------------|--------|
| Purity & Side Effects      | Pass   |
| State Design               | Fail   |
| Message Design             | Pass   |
| ...                        | ...    |
```

### Recommendations

If the program has outgrown its file organization (e.g., single-file app with 20+ message variants, or update function exceeding 200 lines), recommend the next tier's structure and explain what to extract.

## Phase 6: Offer to Fix

After presenting the report, ask the user if they'd like you to fix the issues found. If they agree, apply all fixes, then re-run `npx tsc --noEmit` to verify the fixes compile.
