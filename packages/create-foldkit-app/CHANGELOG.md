# create-foldkit-app

## 0.6.0

### Minor Changes

- 8364888: Add `crash-view`, `job-application`, `kanban`, and `pixel-art` to the `--example` choice list. These four examples already shipped in the monorepo and on the website but were missing from the create-foldkit-app selectable list, so users could not scaffold them via `pnpm create foldkit-app`. Reorder the choice list and CLI help descriptions to match the website's example ordering.

## 0.5.17

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.5.16

### Patch Changes

- 4400851: Fix `create-foldkit-app` failing on Windows. Use `where` instead of `which` for package manager lookup, and run install commands through the shell so Windows can resolve the `.cmd` shims that npm, pnpm, and yarn ship as.

## 0.5.15

### Patch Changes

- e72bd7f: Wire Scene matchers into the scaffolded project. The base template now ships
  `src/vitest-setup.ts` (three lines: `import { setup } from 'foldkit/test/vitest'; setup()`) and `vitest.config.ts` registers it via `setupFiles`. Previously,
  projects scaffolded with `--example form|weather|todo|auth|kanban|pixel-art`
  pulled in the example's `src/vitest-setup.ts` and scene tests but never ran the
  setup file — Scene matcher assertions would fail at runtime.

## 0.5.14

### Patch Changes

- 60f1594: Use a precise optimizeDeps entry point (src/main.ts) so Vite's dependency scanner never crawls into the repos/ submodule.

## 0.5.13

### Patch Changes

- 015c96a: Scaffold vitest configuration in new projects. Adds `vitest.config.ts` with `server.deps.inline: ['foldkit']` so tests resolve foldkit through Vite's bundler pipeline, a `test` script in `package.json`, and vitest and happy-dom as dev dependencies.

## 0.5.12

### Patch Changes

- 321dac6: Update AGENTS.md template to use `toParentMessage` (renamed from `toMessage`).

## 0.5.11

### Patch Changes

- c6a5404: Add testing section to AGENTS.md template pointing agents to `foldkit/test` and the submodule's exemplar test files

## 0.5.10

### Patch Changes

- f456720: Exclude submodule directory from Vite dependency scanner to prevent resolution errors

## 0.5.9

### Patch Changes

- bdd444e: Add `git init` to CFA success message and use `>` prompt prefixes for shell commands

## 0.5.8

### Patch Changes

- c416561: Indent the AI-Assisted Development section body in the success message and title-case the header

## 0.5.7

### Patch Changes

- 8817558: Add AI-assisted development section to success message with submodule setup instructions.

## 0.5.6

### Patch Changes

- 9f3cde2: Add newsletter signup link to success message

## 0.5.5

### Patch Changes

- 964e13f: Rewrite scaffolding success message with personality. Fix object-first naming rationale in AGENTS.md template.

## 0.5.4

### Patch Changes

- 4b81a10: Update GitHub URLs from `devinjameson/foldkit` to `foldkit/foldkit` following org transfer.

  Update AGENTS.md template to replace `NoOp` guidance with `Completed*` message conventions.

## 0.5.3

### Patch Changes

- 8b27c43: Update scaffolding success message with personal note and links to GitHub issues and social

## 0.5.2

### Patch Changes

- 1369d6a: Use `repos/` convention for submodule path. Submodules now clone into `repos/foldkit` instead of `./foldkit`. Updated Prettier, ESLint, and editor ignore configs.

## 0.5.1

### Patch Changes

- 7c0a3b7: Sync AGENTS.md template conventions with CLAUDE.md to keep scaffolded projects aligned with current Foldkit coding standards.

## 0.5.0

### Minor Changes

- 8c9e95f: Add ui-showcase as a starter template showing every Foldkit UI component with sidebar navigation and routing.

## 0.4.3

### Patch Changes

- 15e6c87: Update base template formatting to printWidth 80 and refresh example descriptions.

## 0.4.2

### Patch Changes

- 7b164d1: Read CLI version from package.json at runtime instead of hardcoding it.

## 0.4.1

### Patch Changes

- 4ee0289: ### Fixes
  - **Update template to use subscription naming** — align starter template with the command stream to subscription rename

## 0.4.0

### Minor Changes

- 5ff61e0: ### Features
  - **AGENTS.md and .ignore in starter template** — new projects now ship with an AGENTS.md file and a .ignore file for better AI assistant and tooling support

## 0.3.2

### Patch Changes

- 598f974: Enable noUncheckedIndexedAccess in project template tsconfig
