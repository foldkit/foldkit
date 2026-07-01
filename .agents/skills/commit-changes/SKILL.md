---
name: commit-changes
description: Create a git commit in the Foldkit monorepo with changeset enforcement and formatting. Use when the user asks Codex to commit current changes, make a commit, create a changeset-backed commit, or prepare a local Foldkit commit.
---

# Commit Changes

Create a single local commit for Foldkit changes. Do not push.

## Workflow

1. Inspect the worktree with `git status --short`, `git diff HEAD`, `git branch --show-current`, and `git log --oneline -10`.
2. Identify changed files owned by the current task. Do not stage unrelated user changes.
3. Check whether changed files touch any published package path:
   - `packages/foldkit/` -> `foldkit`
   - `packages/ui/` -> `@foldkit/ui`
   - `packages/devtools/` -> `@foldkit/devtools`
   - `packages/create-foldkit-app/` -> `create-foldkit-app`
   - `packages/vite-plugin-foldkit/` -> `@foldkit/vite-plugin`
   - `packages/devtools-mcp/` -> `@foldkit/devtools-mcp`
   - `packages/oxlint-plugin-foldkit/` -> `@foldkit/oxlint-plugin`
4. If a published package changed, inspect `.changeset/*.md` excluding `README.md` and `config.json`. Verify a changeset covers each changed package.
5. If a changed published package has no covering changeset, create one:

```markdown
---
'package-name': patch
---

Concise description of the change.
```

Use `patch` for bug fixes, docs, internal refactors, and metadata changes. Use `minor` for new features, non-breaking API additions, and breaking changes while the project is pre-1.0. Do not use `major`.

For breaking changes, include a brief migration note in the changeset description.

6. Run `pnpm format`. Inspect formatting changes and stage only files that belong to the requested commit.
7. Stage relevant files with `git add`.
8. Create one Conventional Commit with `git commit`.
9. Verify the final commit message with `git log -1 --format=%B`. If any
   body line is longer than 80 characters, amend the commit before stopping.
   Re-check the subject, scope, author, and branch shape after every amend.

## Commit Message Rules

- Use a valid scope from `AGENTS.md` when one scope describes the commit's
  primary intent. If no valid scope cleanly describes the whole change set,
  omit the scope.
- Inspect the full staged diff before choosing the subject: run `git diff --cached --stat` and `git diff --cached --name-status`. If amending an existing commit message, inspect `git show --stat --name-status HEAD`.
- Make the subject describe the whole change set, not just one file, one subtask, or the latest edit.
- Choose the scope from the whole change set's primary intent, not from the
  last file edited, a helper file, or any single path in the diff.
- Use only literal valid scopes from `AGENTS.md`. Do not invent broad scopes such as `tooling` or `infrastructure`.
- Use an imperative title.
- Keep the subject concise.
- Include a body when the commit changes behavior, fixes a bug, adds migration or debugging context, or needs rationale that the subject cannot carry. Do not rely on changesets, PR text, or chat context to explain why the change exists.
- Use the body to explain the problem and why this approach was taken. Avoid merely restating the staged file list.
- Subject-only commits are acceptable only for trivial mechanical changes where the context is obvious from the subject and diff.
- Wrap commit body lines at 80 characters. Do this before committing or
  amending, and verify it afterward.
- Add `!` after the scope for breaking changes.
- Do not add co-author lines.
- Do not mention Codex, Claude, or any AI assistant.

Before stopping after a commit or amend, verify:

- The subject describes the whole final diff.
- The scope is valid, or intentionally omitted for a cross-scope change.
- Body lines are wrapped at 80 characters.
- Author and committer are correct.
- The branch has the intended number of commits.

## Boundaries

- Do not run the release process. Releases are automated.
- Do not edit changelogs manually.
- Do not push unless the user explicitly asks.
- If the worktree contains unrelated changes that make staging ambiguous, stop and ask which files belong in the commit.
