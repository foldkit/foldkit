---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(pnpm changeset status:*), Read, Write, Glob
description: Create a git commit with changeset enforcement
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

Based on the above changes, create a single git commit. Follow these steps in order:

### Step 1: Check for changeset requirement

The published packages in this monorepo are:

- `foldkit` (path: `packages/foldkit/`)
- `@foldkit/ui` (path: `packages/ui/`)
- `@foldkit/devtools` (path: `packages/devtools/`)
- `create-foldkit-app` (path: `packages/create-foldkit-app/`)
- `@foldkit/vite-plugin` (path: `packages/vite-plugin-foldkit/`)
- `@foldkit/devtools-mcp` (path: `packages/devtools-mcp/`)

Look at the changed files. If ANY changed file is inside a published package path, check whether a `.changeset/*.md` file (excluding README.md and config.json) already exists that covers that package.

If a published package has changes but no changeset covers it:

1. Determine the bump level:
   - **empty**: an internal change with no user-facing effect, such as a pure refactor, a move between modules that leaves the published surface and behavior unchanged, or a test-only change. Write a file at `.changeset/<descriptive-name>.md` holding only the two frontmatter delimiters, which is what `pnpm changeset add --empty` generates under a random name. It satisfies `changeset status` without adding a release entry.
   - **patch**: bug fixes, docs, metadata changes
   - **minor**: new features, non-breaking API additions, or breaking changes (project is pre-1.0, so never use `major`)
2. Create a changeset file at `.changeset/<descriptive-name>.md` with this format:

```markdown
---
'package-name': patch
---

Description of the change.
```

Use single quotes around the package name. Write a concise but meaningful description. For breaking changes (removing or renaming public exports, changing behavior), include a brief migration guide in the changeset description showing what consumers need to change.

If no changed files touch published packages, skip this step entirely.

### Step 2: Format

Run `pnpm format` to format the code before committing. Stage any formatting changes.

### Step 3: Stage and commit

Stage all relevant files (including any new changeset files) and create the commit.

Do not use any other tools or do anything else besides these steps. Do not send any other text or messages besides tool calls.
