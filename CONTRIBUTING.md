# Contributing to Foldkit

Thanks for contributing. This guide covers the process: how to get set up, what the checks enforce, and what a reviewable change looks like.

For code style, read [`AGENTS.md`](./AGENTS.md). It is the reference for naming, state modeling, view architecture, and file organization, and it applies to human and agent contributions alike. This guide does not repeat it.

## Getting Set Up

Foldkit is a pnpm workspace.

```sh
pnpm install
```

Node `^22.22.2 || ^24.15.0 || >=26.0.0` and pnpm `>=11`. The repository pins `pnpm@11.8.0` via `packageManager`, so Corepack will select the right version on its own.

`pnpm install` also installs the git hooks. Two of them run:

- **commit-msg** rejects a `Co-Authored-By` line naming Claude.
- **pre-push** runs the full check suite described below.

## Before You Push

The pre-push hook runs `pnpm pre-push`, which is the same suite CI runs. You can run it yourself at any point:

```sh
pnpm pre-push
```

It takes several minutes because it builds every package, typechecks the whole workspace, runs every test suite, and finishes with a Chromium end-to-end pass over the website. That is intentional: a green local run means a green CI run.

For a faster inner loop while working, the individual pieces are available:

```sh
pnpm lint
pnpm -r typecheck
pnpm test
pnpm format
```

If a typecheck reports something like `Cannot find module 'foldkit'`, the libraries have not been built. Foldkit's `exports` map points at `dist/`, so anything depending on it needs a build before it will typecheck. Run `pnpm build` once, or `pnpm dev:libs` to rebuild in watch mode while you work.

Beyond the usual lint, typecheck, and test steps, the suite enforces a few repository-specific rules that are easy to trip over:

| Check                              | Rule                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check:no-claude-comments`         | No unresolved `CLAUDE:` comments in tracked files, apart from the checker itself and the two documents describing the rule. Resolve or remove them before pushing. |
| `check:commit-message-line-length` | Commit message prose wraps at 80 characters. Unbreakable lines such as URLs are exempt.                                                                            |
| `check:no-major-changesets`        | No `major` changesets. Foldkit is pre-1.0, so breaking changes ship as `minor`.                                                                                    |
| `check:changeset-unwrapped`        | Changeset prose is not hard-wrapped. Write each paragraph as one line.                                                                                             |
| `changeset status`                 | Every change to a publishable package has a changeset.                                                                                                             |
| `check:dead-code`                  | No unused files, exports, or dependencies.                                                                                                                         |

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/). Add `!` after the scope for a breaking change, as in `refactor(foldkit)!:`.

Valid scopes are package directory names (`foldkit`, `ui`, `devtools`, `create-foldkit-app`, `vite-plugin`, `devtools-mcp`, `oxlint-plugin`, `markdown`, `website`, `typing-game`, `examples-e2e`), example directory names, plus `skills`, `ci`, and `release`. Never an internal module name. Omit the scope when none fits the whole change. Do not invent broad scopes such as `tooling` or `infrastructure`.

`skills` is narrower than it looks. It means the Foldkit app skills shipped under `skills/` and their packaging, not repository-maintenance helpers such as `.agents/skills/commit-changes`, which take no scope.

A comma-separated scope such as `feat(foldkit,ui):` is for a change with real work in both packages. It has happened twice. Documentation does not earn a scope slot: a change to `packages/ui` that updates its docs page is `feat(ui)`, not `feat(ui,website)`, and `website` is the scope only when the site itself is what changed.

Write a subject that names the mechanism or the identifiers, not the category of work:

```text
BAD:  fix(ui): name factory result types
GOOD: fix(ui): export a named return type for every create factory
```

The first could describe a dozen changes. The second says what moved.

**Commits carry a body.** This is the convention most new contributors miss, because it is invisible until you read the log. Every substantive commit in the history explains what was wrong before stating what changed. Read `git log` for a few examples before writing your first one. A one-line commit reads as unfinished here.

Write both against the whole change set rather than the file you touched last. Check what you are describing with `git diff --cached --stat --name-status` before committing. After an amend that adds or drops files, re-check the body against `git show --stat --name-status HEAD`, because a message written for the original diff quietly stops matching the final one.

Do not mention AI assistants or add AI co-author trailers, in commit messages or release notes.

## Changesets

Any change to a publishable package needs a changeset. The publishable set is `foldkit`, `@foldkit/ui`, `@foldkit/devtools`, `create-foldkit-app`, `@foldkit/vite-plugin`, `@foldkit/devtools-mcp`, `@foldkit/oxlint-plugin`, and `@foldkit/markdown`. Examples and the website are in the changeset `ignore` list and need none.

```sh
pnpm changeset
```

Four things the tool will not do for you:

**Rename the file.** The generator produces a random slug like `tidy-menus-travel.md`. Rename it to describe the change: `anchor-lock-placement.md`, `command-defer-execute-body.md`, `route-transition-naming.md`. Every changeset in the history is named this way.

**Pick the right bump.** Anything that widens the public API surface is `minor`, including a new export, a new config field, or a new function. `patch` is for fixes that leave the surface unchanged. An internal change with no user-facing effect, such as a refactor or a test-only change, takes an empty changeset from `pnpm changeset add --empty`, which satisfies `changeset status` without adding a changelog entry. Breaking changes are also `minor`, because the repository is pre-1.0 and `major` is rejected outright. Note that `foldkit`, `@foldkit/ui`, and `@foldkit/devtools` are version-fixed, so bumping one bumps all three.

**Write it as release notes.** The changeset is what users read in the changelog, so it is not a commit message and not a one-line summary. Explain what changed, what was wrong or missing before, how the new thing behaves, and what stays the same. Writing multiple paragraphs is normal, and a short code example is welcome. `.changeset/` in the git history has the models; `anchor-lock-placement.md` from release 0.137.0 is a good one.

**Credit the contributor.** When a changeset ships someone else's work, thank them by handle at the end, the way existing changesets do.

## Documentation

A change to a public API updates the docs in the same pull request. The relevant page lives under `packages/website/src/page/`, and each component or concept page carries an `## API Reference` section listing its exported types.

TypeScript examples on docs pages live in `packages/website/src/snippet/` and are pulled in with `::Snippet{name="..." label="..."}`, which renders them in a labeled panel. There is not a single `ts` fence anywhere under `packages/website/src/page/`, so add a snippet rather than starting the first one.

Snippets are excluded from typecheck (`tsconfig.json`), lint (`.oxlintrc.json`), and dead-code analysis (`knip.json`). That is deliberate: most are pseudocode walkthroughs that show the integration points as excerpts, so they reference types they never import and would not compile as written. Do not assume a snippet is checked, and keep them illustrative rather than trying to make them build.

Fences are still right for shell commands, file trees, and plain output, which is what the existing `sh`, `text`, and `diagram` blocks are.

Prose has one hard rule: no em dashes. Use a period and a new sentence, or a comma, colon, semicolon, or parentheses. This applies to documentation, TSDoc, comments, changesets, commit messages, and pull request descriptions.

## Pull Requests

Describe the change the way the commit body does: what was wrong, what you changed, and what you deliberately left alone. Call out scope decisions explicitly so a reviewer can disagree with them directly rather than discovering them in the diff. Say how you verified the change, and be specific about anything you could not verify.

Pull requests are squash-merged, so the description becomes the commit body on `main`. Strip any bot-generated summary sections before merging.

## A Note on Style Review

Foldkit is opinionated, and review comments here tend to be about conventions rather than correctness. For example: a type name that collides with the Message naming scheme, a missing TSDoc on a public export, or an `interface` where the repository uses `Readonly<{...}>`. None of that is a judgment on the change. It is what keeps a codebase this size readable by everyone working in it.

`AGENTS.md` documents most of it. When something comes up in review that is not written down anywhere, that is a gap in these docs, and a pull request fixing it is as welcome as one fixing code.
