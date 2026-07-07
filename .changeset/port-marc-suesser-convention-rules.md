---
'@foldkit/oxlint-plugin': minor
---

Add 16 convention rules, taking the plugin from 8 to 24. Rule designs come from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) by Marc Suesser (MIT), curated for Foldkit in #607 by @artile, and reimplemented here from behavior specs in house style.

- Command shape: `command-define-pascal-const`, `no-hand-rolled-command-struct`
- Submodel wiring: `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
- Model updates: `no-spread-in-evo`
- View keying and accessibility: `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `require-rel-for-external-link`, `no-raw-dom-event-attributes`
- Routing: `no-hardcoded-route-strings`
- Lifecycle: `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`, `lazy-view-stable-references`
- Dev config: `no-disabling-dev-guardrails`

Every rule lives in `src/rules/` with a colocated unit test and a real-oxlint integration fixture. The generated `recommended` preset (every rule at error) and `all` preset now carry the package specifier, so consumers can spread either into their oxlint config and have the plugin resolve. Nothing is enabled in the scaffold preset; adopting any of these stays opt-in per app, so existing projects see no change.
