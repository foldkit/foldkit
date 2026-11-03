# Real-app declaration boundary review

## Current result

Whole-project declaration emission now passes for Workspace, Job Application,
and Website. The framework retains validated Binding facts independently of the
parent Schemas and reconstitutes the same complete Binding methods against the
Composition. Descriptor OutMessage folds retain their exact per-case callable
results in compact, named contracts. No application annotations, casts, or
builder wrappers were added.

The real-app gate at `../app-declarations/verification/run-ly0B7l` emits all
786 configured declaration files. Its strict relocated consumer imports the
completed roots and extracted Composition, init, update, and view exports.
All three consumers pass with zero original application/framework files read.
The framework build hash stays unchanged throughout this final run.
Changing the copied root, Composition, update, or view to `any` fails the
precision checks; each restored baseline passes.

Completed root headers remain 45,528 bytes for Job Application, 95,118 for
Workspace, and 112,220 for Website. Full implementation output remains much
larger: about 5.7 MB, 8.5 MB, and 47.2 MB respectively. This resolves the current
serialization failures; it does not promise small declarations for arbitrary
implementation graphs.

The final union-child check also preserves the policy obligation when a Query
may notify. The distributive Binding representation needs its existing member
alias exported through the public type barrel so declaration emission can name
it. That two-export correction preserves the exact type equation. See
[the plan report](PLAN-REPORT.md) for the failing and restored checks.

[Fold contract verification](FOLD-RESULTS.md) records source/emitted equality,
correlated conditional results, refined Models, Context, Commands, registration,
and custom-policy fallbacks. The canonical Binding parity runner checks full
method/evidence equality, unions, mutable inventories, and meaningful mutation
controls.

The sections below preserve the earlier failures, scope, and experiments that
preceded the compact representation.

## Website regression and fix

Normal `packages/website` `tsc --noEmit` reproduced errors in `page/ui/demo/popover.ts`, `snippetCopyRenderer.ts`, and `snippetDisclosureRenderer.ts`.

These helpers inspect `Parameters<typeof Binding.embedView>[0]`. The descriptor alternate-view signature was last in the native Binding intersection. TypeScript therefore reflected that generic signature instead of the existing canonical default-view signature and produced `never`.

The fix moves the existing `Extra` intersection before the native Binding in `SelectedChildBinding`, `BindingWithoutOutMessagePolicy`, and the unselected constructor result. No signatures, channels, validators, or runtime functions changed. The alternate-view call remains available, while the canonical default-view signature is last for reflection.

Evidence:

- Initial normal source failure: `/private/tmp/foldkit-website-current-noemit.log`.
- Normal source after the fix: `/private/tmp/foldkit-website-order-fixed.log`, exit 0.
- Source library check and core/UI builds: `/private/tmp/foldkit-emission-order-{source,core-build,ui-build}.log`, all exit 0.
- Native and authored view tests: `/private/tmp/foldkit-view-overload-order-runtime.log`, 28 tests passed.
- `view-composition/verification/run-gssJGZ`: source, runtime, emission, strict relocation, six purposeful copied-package mutations, and restored baseline passed.

The declaration fixtures retain exact reflected default Inputs, reject incorrect reflected Inputs, and preserve alternate-view owner/Inputs/key rejections. The new `lost-default-view-reflection` mutation restores the old intersection order and makes the accepted reflection fixture fail.

`diagnose-overloads.mjs` is a standalone copies-only reproducer using the actual Website source. On the fixed build its baseline must pass; restoring the old order must fail at all three original sites. The original pre-fix paired experiment is preserved in `overloads-flqcmo`.

## Actual application emission

Canonical type-name exports removed all `TS2883` errors. The overload-order fix removed all semantic Website errors. No application builder annotations were introduced.

Final real-app run: `../app-declarations/verification/run-jnAmOh`. Its strict relocated consumer run `consumer-4jAqCb` passed all three roots, rejected the copied root-to-`any` mutation, and verified that no original application/framework source or dist was resolved. This run includes the validation contract split and Website view-input extraction.

| Application     | Root declaration bytes | Remaining TS7056 nodes |
| --------------- | ---------------------: | ---------------------: |
| Job application |                 45,528 |                      4 |
| Workspace       |                 95,118 |                      5 |
| Website         |                112,220 |                     38 |

The remaining failures concern exported intermediate Composition/init/update/view values. Ordinary application typechecking and runtime builds do not emit these declarations. The failure is still an authoring-type serialization limitation: it is not evidence that all intermediate exported graphs can be published without a boundary.

## Bounded naming experiments

`diagnose-boundary.mjs` copies the built package and changes declarations only. It uses the installed TypeScript 6 parser to make exact AST edits; all application checks run with the package's actual TypeScript 7 compiler. The real manifest and application sources remain unchanged.

| Encoding                                       | Job TS7056 | Workspace TS7056 | Website TS7056 |
| ---------------------------------------------- | ---------: | ---------------: | -------------: |
| Current baseline                               |          4 |                5 |             38 |
| Named descriptor Binding extension             |          4 |                5 |             38 |
| Named descriptor Binding result plus extension |          4 |                5 |             38 |

Logs: `boundaries-yBjrhy` for the baseline and `boundaries-dfNrKf` for both named variants. No portability or semantic errors were added.

The extension alias replaces the anonymous `BindingParent & DescriptorViewExtension & connect & YieldableBinding` expression with one named generic alias. It reduced the representative PersonalInfo Composition header from 437,033 to 382,667 bytes, but removed no serialization failures. The outer result alias reduces back to the native selected-policy type, so it adds no further reduction.

A final copied `StaticSourceFields` interface retained exact owner, Schemas, child inventory, local Mounts, and canonical dispatch metadata while removing the native authoring callbacks from the source type. It likewise left all four Job serialization failures unchanged. Log: `boundaries-tgGQpE`. This control did not change application behavior or drop static graph evidence.

The remaining size comes from exact child Binding inventories, repeated parent Schema contracts, and selected policy/operation evidence in those inventories. Naming the same generic graph does not compress its type arguments. Dropping that evidence would affect completion, registration, initialization, or policy checks and is outside this bounded change.

## Reproduce

Run from the repository with Node 22 and built core/UI artifacts:

```sh
node internal/layered-constructor/emission-boundary/diagnose-overloads.mjs
node internal/layered-constructor/emission-boundary/diagnose-boundary.mjs baseline named-extensions named-bindings
FOLDKIT_DIAG_APP=job-application node internal/layered-constructor/emission-boundary/diagnose-boundary.mjs flat-source
node internal/layered-constructor/view-composition/verify.mjs
```

All diagnostic mutations operate on disposable copies. No compiler fixtures or budgets were changed. The root integration run owns the final unchanged seven-fixture performance measurement.

## Packed Program return-type name

The real packed TypeScript 6 consumer exposed one more canonical nameability gap:
`Program.make` directly returns `ConstructionProgramFromRoot`, but that existing
type was not exported by `foldkit/program`. The type is now reexported through
`runtime/program.ts` and `runtime/programPublic.ts`. Its definition and all
requirements remain unchanged.

The new canonical `program-construction-portability` fixture retains inferred
page and element factories alongside the existing native portability fixture.
The standard Program source check passes. `verify-program.mjs` additionally
checks TypeScript 6 emission, removes only that public name from a copied package
and observes the original `TS2883`, restores emission, then checks the declarations
from a physically relocated package with `skipLibCheck: false` and no original
source/dist resolution. All four groups pass in `program-ez13o3`.

The normal seven-package packed SSR gate then passed strict external TypeScript
checks, one Effect runtime/peer validation, real browser hydration and refusal
checks. Log: `../packed-adoption/verification/packed.log`.

## Final compiler-cost correction

The final unchanged budget run found Workspace eight-group Types at 304,422,
above its existing 299,721 ceiling. Paired copied declarations ruled out the
Binding reflection fix: restoring only its previous intersection order left
304,466 Types, while Machine remained unchanged.

The cause was the new flat FieldValidation rule-type export pointing at the
module that also owns all runtime rule factories. Removing just that export
restored 277,937 Types; adding it to the saved passing declarations reproduced
304,466. Logs: `reflection-performance-WlTemJ`, `reflection-performance-T6w1ol`,
and `reflection-performance-hoz6Rh`.

`Rule` and `RuleMessage` now belong to the lightweight `ruleContract.ts` module.
The original `Rule` namespace reexports those exact types, and the flat canonical
type exports remain available. Rule behavior and the Binding reflection fix are
unchanged. This is an ownership boundary; no compiler fixture, budget, public
contract, or import-order exception was changed.

The full core source check, all 75 FieldValidation tests, and the existing
seven-fixture performance gate pass. Job root emission retains its 45,528-byte
header with zero portability errors and the same four recorded intermediate
serialization errors (`boundaries-anTrZe`).

| Fixture                | Final instantiations | Final Types |     Existing maxima |
| ---------------------- | -------------------: | ----------: | ------------------: |
| Workspace eight groups |            4,275,466 |     280,592 | 4,515,010 / 299,721 |
| Machine search         |               81,800 |      18,088 |     83,700 / 18,800 |
| Wide Subscriptions     |              547,953 |      24,230 |    548,740 / 24,583 |

Full log: `/private/tmp/foldkit-rule-contract-final-budgets.log`.

The default `diagnose-reflection-performance.mjs` invocation is reproducible from
the current built package without an old snapshot. It compares current
declarations with a disposable mutation that places the rule contracts back in
the runtime module. It reads the unchanged budget file and requires the baseline
to pass and the mutation to exceed the Types ceiling. `reflection-performance-WuEAx7`
records the exact pair: 280,592 versus 304,422 Types. Earlier diagnosis options
also retain the saved historical comparisons; none mutate canonical source or
dist.
