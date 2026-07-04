---
'@foldkit/oxlint-plugin': minor
---

Add 32 convention rules, taking the plugin from 8 to 40. Rule designs come from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) by Marc Suesser (MIT), curated for Foldkit in #607 by @artile, and reimplemented here from behavior specs in house style.

- Routing: `route-union-parser-registration`, `route-oneof-shadowing-order` (shadowing modeled against the real parser semantics, including `rest`), `no-hardcoded-route-strings`
- View keying and accessibility: `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `label-requires-for`, `require-rel-for-external-link`, `no-raw-dom-event-attributes`
- The `evo` idiom: `prefer-evo-over-model-spread`, `no-spread-in-evo`
- Command shape: `command-define-pascal-const`, `no-hand-rolled-command-struct`, `no-explicit-command-type-annotation`, `require-succeeded-failed-pair`, `require-completed-mirrors-command`
- Purity boundaries: `no-impure-calls-in-pure-layer`, `no-disabling-dev-guardrails`
- Submodel wiring: `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
- Lifecycle handles: `managed-resource-for-stateful-handles`, `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`
- DOM and UI helpers: `prefer-dom-helpers-for-element-ops`, `prefer-empty-over-empty-element`, `ui-toview-must-spread-attribute-bundles`, `lazy-view-stable-references`
- Message naming: `require-past-tense-message-names` (accepts any -ed verb plus an irregulars list, extensible per app via the `extraVerbs` option), `no-changed-message-prefix`
- Test shape: `subscription-file-canonical-shape`, `prefer-story-command-matchers`

Every rule lives in `src/rules/` with a colocated test file. Nothing is enabled in the scaffold preset; adopting any of these stays opt-in per app, so existing projects see no change.
