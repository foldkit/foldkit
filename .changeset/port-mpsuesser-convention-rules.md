---
'@foldkit/oxlint-plugin': minor
---

Add 38 convention rules ported from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) (MIT, © Marc Suesser), bringing the plugin from 8 to 46 rules. They extend the existing message/command-naming checks into Foldkit's other convention surfaces:

- **Routing** — `route-union-parser-registration`, `route-oneof-shadowing-order`, `no-hardcoded-route-strings`
- **View keying & accessibility** — `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `label-requires-for`, `require-rel-for-external-link`, `no-hand-rolled-form-controls`, `no-raw-dom-event-attributes`
- **The `evo`/Model update idiom** — `prefer-evo-over-model-spread`, `no-spread-in-evo`, `prefer-option-match-over-map-getorelse`
- **Command shape** — `command-define-pascal-const`, `command-failed-result-requires-catch`, `no-hand-rolled-command-struct`, `no-explicit-command-type-annotation`, `require-succeeded-failed-pair`, `require-completed-mirrors-command`
- **Purity boundaries** — `no-impure-calls-in-pure-layer`, `no-disabling-dev-guardrails`
- **Submodel wiring** — `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
- **Lifecycle handles** — `managed-resource-for-stateful-handles`, `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`
- **DOM & UI helpers** — `prefer-dom-helpers-for-element-ops`, `prefer-empty-over-empty-element`, `ui-toview-must-spread-attribute-bundles`, `lazy-view-stable-references`
- **Message naming** — `require-past-tense-message-names`, `no-changed-message-prefix`, `foldkit-primitives-declared-in-role-files`
- **Test shape** — `subscription-file-canonical-shape`, `prefer-story-command-matchers`, `scene-tests-run-from-root`
- **Type shape** — `no-array-shorthand-type`

Each new rule lives in `src/rules/` (one per file) with co-located tests. The eight existing rules are unchanged. None of the new rules are enabled in the scaffold preset — enabling them per app stays opt-in, so this is additive and non-breaking for existing projects.
