# Named Plan declaration experiment

## Result

Keep the named Plan experiment diagnostic. Source-only interfaces reduce repeated types and allow Workspace's root view to emit, but do not resolve the large Website inventory. Naming update Plans around raw handler outputs also introduces `TS4023` errors for graph-branded Models that the original derived return did not serialize.

No Plan representation change was added to the library. The subsequent compact Binding inventory integration is separate and retains the original Plan types.

## Exact copied changes

`diagnose-plans.mjs` applies changes only to a disposable built-package copy, on top of the flat descriptor experiment from `diagnose-portable.mjs`.

The first control gives named interfaces defaulted Model, Message, and Binding arguments so independent hybrid helper generic arguments retain their original meaning. TypeScript materializes those defaults in emitted declarations. PersonalInfo's init grows from 189,043 to 323,391 bytes, so defaults do not provide a compact boundary.

The second control leaves the general hybrid helpers unchanged. It gives the contract-bound builders Source-only named return interfaces:

- `SourceInitPlan<Source, Args, Output>` derives the original `InitializationReturn`.
- `SourceUpdatePlan<Source, Context, Outputs, Keys>` derives the original `CompositionDefinedUpdate` and per-handler `OperationOutputs`.
- `SourceViewPlan<Source, Inputs>` retains the native callable view, all five public view metadata members, and `EmbeddedViewPlan` provenance.
- `SourceDocumentViewPlan<Source>` retains the native Document view.

`SourceMakeUpdatePlan` mechanically substitutes Source-derived generic arguments into the existing callback constraints and validation. It does not simplify handler outputs, registration, requirements, or Context. The copied canonical Block barrel makes the named return interfaces reachable.

## Measurements

The paired original run is preserved in `plans-OyHar2`. The final Source-only run and focused controls are in `plans-HPEo80/source-plans-EwVRvP/flat-descriptors`.

| Encoding                   | Job TS7056 | Workspace TS7056 | Website TS7056 |
| -------------------------- | ---------: | ---------------: | -------------: |
| Flat descriptors           |          0 |                3 |             37 |
| Defaulted Plan arguments   |          1 |                3 |             37 |
| Source-only Plan arguments |          0 |                2 |             37 |

Source-only outputs add `TS4023` on one Job update, one Workspace update, and three Website updates. These errors concern `GraphCapabilityTypeId` in raw inferred handler Models. `GraphCapability` itself is already a named public type; no extra private-brand export was added to hide this result.

PersonalInfo's Source-only view falls from 216,043 to 160,387 bytes; its init falls from 189,043 to 161,459 bytes. Workspace's root view emits a 1,646,349-byte declaration, while its init and update still exceed the serialization limit. All three completed public root header sizes remain unchanged.

The remaining Website view failures persist when the view's output is derived internally and its Source is serialized once. The exact source inventory is therefore still material to the limit.

## Precision checks

`plan-parity.ts` compares the copied Source-only types to the unchanged general hybrid helpers with `skipLibCheck: false`:

- Exact initializer and local/contextual update `PlanOutput` types.
- Data-first and curried update returns.
- Required, optional, defaulted, and rest Context arguments, including rejected omissions and incorrect rest values.
- Exact Element, input-bearing Element, and Document `PlanOutput` types.
- Bidirectional callable-view compatibility and exact view metadata.

The final run passes the baseline, detects copied mutations that remove per-handler operation channels, view provenance, or update Context, and passes after restoration. The files `plan-parity-*.log` preserve those results.

## Compact Binding inventory review

`binding-spec-parity.ts` separately protects the compact inventory representation. It compares initialized direct, optional, keyed, wrapped, map, accessor, unselected/selected policy, silent-child, never-parent, and contextual relationships before and after restoration from Specs. It checks the complete native StaticSource key set and the exact native init/update/view/completion members.

Two copied failures were found and corrected before canonical integration:

1. An indexed conditional inferred union entries jointly and lost correlations. Separate distributive `BindingSpecOf` and `BindingFromSpec` helpers preserve each arm.
2. An explicit `readonly` mapped modifier narrowed caller-supplied mutable arrays. Ordinary mapped modifiers preserve the original array shape.

Both conditional and mutable inventories are also accepted through actual `Definition.makeComposition` calls in the fixture. The corrected copied package passes all assertions. `verify-binding-spec-parity.mjs` is the canonical-copy runner for the integrated representation; it adds deliberate regressions for both findings and the previously caught incorrect silent-child parent Message metadata, then checks emission and physical relocation.

The first built canonical representation passed all seven parity groups in `binding-parity-bYkOLk`. A subsequent real Query declaration rejection exposed a different union edge: a notifying/silent child union lost its notifying policy obligation before the Spec projection. `DescriptorBinding` now distributes over the child alternatives, with a distributive default policy and `never` policy evidence for silent arms. The expanded fixture preserves each child alternative and policy, rejects composition without the possible notifying policy, and has a fourth copied regression control. Its old-build failure is preserved in `binding-parity-UVTRfp/source.log`; replacing only that copy's pure Binding contract declarations makes the source check pass.

The final coordinated core/UI build passes all eight groups in `binding-parity-As9DgL/results.json`: source, four deliberately failing copied-declaration controls, restored source, declaration emission, and strict physically relocated consumption. The original `tsconfig.query-policy.source.json` group also exits zero, consuming the dynamic Query's required-policy rejection again. These checks use the final built package without rebuilding or mutating canonical declarations.

## Rejected cross-Definition codec probe

`binding-key-codec.ts` explores two family Definitions with the same namespace/key and decoded parent shape, but wrapped numeric keys encoded as string versus number. Their static `makeComposition` call accepts the foreign Binding, and the rederived Source key differs from the native Binding's captured codec. Executing the actual passive calls rejects that input immediately with `A Binding belongs to another parent Definition.`

This is an existing compile-time limit on distinguishing two allocations of one generic family, rather than a supported runtime case. A valid Binding stays attached to the exact Definition that fixed its parent Schema. No extra key-codec metadata was added for the rejected case.

## Reduced union-member nameability

The final distributive child-policy correction exposed a declaration serialization regression in all three full applications (`app-declarations/verification/run-srzlty`). The reduced result selected the private `DescriptorBindingMember` alias, so TypeScript expanded its complete intersection instead of naming it. A copied-package control exports that existing alias and gives it a canonical type-only Block reexport, without changing either type equation. Workspace, Job and Website then all emit with zero `TS7056` or `TS2883`; their public root header sizes stay 95,118, 45,528 and 112,220 bytes. The paired result is `union-member-OTrDCj/results.json`. The lead applied exactly those two exports. The final built package passes all eight Binding parity groups, including all four copied regression controls, emission and strict relocation (`binding-parity-mgH366/results.json`). The original dynamic Query policy source group also exits zero. No further type equation changes or serialization workarounds were needed.
