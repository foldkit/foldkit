# Record-only validation screening

## Outcome

Reject the candidate; do not adopt it.

The candidate kept `MissingConnections` unchanged and omitted only the
`InvalidConnections` comparison for children synthesized by the three record
completion overloads. Custom Effect constructors remained on the full original
validator. Focused correctness passed, but the unchanged compiler workloads
showed only negligible savings:

| Workload              | Metric         |  Baseline | Candidate |            Delta |
| --------------------- | -------------- | --------: | --------: | ---------------: |
| layered-composition-6 | Instantiations | 2,706,693 | 2,704,948 | -1,745 (-0.064%) |
| layered-composition-6 | Types          |   336,346 |   336,342 |     -4 (-0.001%) |
| layered-composition-6 | Symbols        |   238,978 |   238,975 |               -3 |
| machine-search        | Symbols        |    43,820 |    43,821 |               +1 |

The other reported instantiation, Type, and symbol counts were identical. All
nine existing ceilings passed without changes. Compiler counters do not
establish a material editor improvement. Given the negligible count savings and
the extra validation machinery, we chose not to expand this experiment into
more expensive emitted-consumer and LSP measurements. This rejection is a
cost/benefit screening decision, not a measured no-latency-effect result.

## Candidate boundary

The source patch:

- factored the existing implementation-recipe validation without weakening it;
- added an internal record validator that retains plan-source validation,
  canonical owner/Schema contracts, `MissingConnections`, Binding/policy/host/
  Mount/Error/Service facts, and full implementation validation;
- selected that validator only for ordinary, family, and resolved-family record
  overloads;
- left every custom Effect overload on the original full validator;
- added custom Effect missing-child and foreign-child negatives plus exact
  record/manual Error and Service equalities.

No public package export, consumer annotation, cast, budget, runtime behavior,
or application source changed.

## Focused proof

- The TS7 record-completion source fixture passed. It was a source-alias check,
  not emitted-package evidence.
- `recordCompletion.test.ts` and `acquireChildren.test.ts` passed: two files,
  20 tests.
- Mutation: routing the ordinary custom Effect overload through the record
  validator made the foreign-child expected error unused while the missing-child
  error remained. The candidate was restored.
- Mutation: removing the record validator's canonical comparison did not admit
  the foreign record; another unchanged boundary still rejected it as `never`.
  This is a non-diagnostic redundant guard, not a failing mutation gate. The
  directive was revealed only to record that diagnostic, then restored.

The first runtime invocation used the wrong Vitest root and loaded zero tests;
its failure is retained. The corrected package-root invocation produced the
20-test pass.

## Malformed control setups

Two attempted widened-Binding controls are retained in `controls/`:

1. Broadening the whole inventory to `AnyBinding & BindingParent` was rejected
   by `makeComposition` because policy evidence was unavailable; its init shape
   also no longer exposed child initialization.
2. Retaining `BindingPolicyEvidence<never>` on one broad Binding still caused
   `makeComposition` to reject an apparently Service-dependent complete Message
   Codec, and exact sibling initialization rejected the supplied Model shape.

Neither attempt reached `makeLayer`. They are invalid test setups, not evidence
that a widened inventory reaches record completion, and not evidence for or
against the candidate's inference behavior. `MissingConnections` stayed intact
throughout the final candidate.

## Build and declaration identity

Baseline and candidate started without local Foldkit `dist` directories and
built private outputs from their own source trees. Shared `node_modules` links
provided installed third-party dependencies; no shared-root Foldkit `dist` was
accepted as candidate evidence.

Each output contained 1,167 files. The full manifests differ only in:

- `experimental/constructed/authoring.d.ts` and map;
- `experimental/contracted/unified.d.ts` and map;
- `experimental/contracted/familyLayer.d.ts` and map.

All emitted JavaScript is byte-identical. The readable three-declaration diff
is `declarations/changed-declarations.patch`; map and full-output identities are
recorded in `receipt.json` and the compressed manifests.

No private UI declaration graph was built because the compiler screening gate
rejected the candidate first. Consequently there is no source-free emitted or
relocated proof, no actual Website declaration-resolution claim, and no LSP
latency or memory claim.

## Practical next discriminator

Do not broaden this candidate. The retained profiles did not attribute the slow
path to `InvalidConnections`, and the counters now show that removing it has
negligible effect. Before another framework type experiment, use bounded
one-child-at-a-time or cumulative child-Layer controls to identify which
realistic imported declaration actually drives graph expansion.
