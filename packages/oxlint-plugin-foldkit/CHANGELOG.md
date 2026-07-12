# @foldkit/oxlint-plugin

## 0.4.0

### Minor Changes

- a25f769: Ship `recommended.json` and `all.json` preset files so a JSON `.oxlintrc.json` can extend a preset directly instead of hand-copying rule lists: `{ "extends": ["./node_modules/@foldkit/oxlint-plugin/recommended.json"] }`. The files are generated at build time from the same source as `configs.recommended` / `configs.all`, ship in `files`, and are reachable through the `./recommended.json` and `./all.json` export subpaths. Consumers pick up new rules with a version bump instead of a config diff.

  Both presets now scope every foldkit rule off in test files (`**/*.test.ts`, `**/*.test.tsx`) via an `overrides` entry. Foldkit rules police application definitions that tests exercise rather than write, and some invert in tests (a route-parsing test must build the URL the router under test parses; a Command test double is hand-rolled by design). Scoping them off by default keeps the ruleset stable as new rules ship in batches, and a rule that wants test coverage can opt in explicitly.

### Patch Changes

- 8dd1906: Drop `RadioGroup` from the `selection-submodel-factory-at-module-scope` rule. RadioGroup is now a stateless controlled render helper with no `create` factory, so the rule covers Combobox, Listbox, Menu, and Tabs.

## 0.3.0

### Minor Changes

- 2d3e621: Add 16 convention rules, taking the plugin from 8 to 24. Rule designs come from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) by Marc Suesser (MIT), curated for Foldkit in #607 by @artile, and reimplemented here from behavior specs in house style.

  - Command shape: `command-define-pascal-const`, `no-hand-rolled-command-struct`
  - Submodel wiring: `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
  - Model updates: `no-spread-in-evo`
  - View keying and accessibility: `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `require-rel-for-external-link`, `no-raw-dom-event-attributes`
  - Routing: `no-hardcoded-route-strings`
  - Lifecycle: `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`, `lazy-view-stable-references`
  - Dev config: `no-disabling-dev-guardrails`

  Every rule lives in `src/rules/` with a colocated unit test and a real-oxlint integration fixture. The generated `recommended` preset (every rule at error) and `all` preset now carry the package specifier, so consumers can spread either into their oxlint config and have the plugin resolve. Nothing is enabled in the scaffold preset; adopting any of these stays opt-in per app, so existing projects see no change.

## 0.2.0

### Minor Changes

- 2d23b39: Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level `let` and `var` declarations (including `export let`), which hold state outside the Model. Ambient `declare let` declarations are not flagged. Scaffolded projects enable the rule in their generated `.oxlintrc.json`.

  Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit` by Marc Suesser.

## 0.1.0

### Minor Changes

- 86b2250: Publish the Foldkit oxlint plugin and scaffold new apps with oxlint and the Foldkit-specific lint rules.
