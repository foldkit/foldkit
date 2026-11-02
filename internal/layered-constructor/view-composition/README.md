# Composition views

A complete Composition view expression can render a helper inside another view from the same Composition. It can also supply an explicit child view to `Binding.embedView`, including when the child's public contract declares no default view. Initialization and update plans remain passive and noncallable.

`makeView.withInputs` preserves contextual typing from the declared public input contract. An explicit local input type authors a reusable helper with different inputs. Completion still checks that the primary view matches the public contract.

## Compilation and ownership

A nested callable view authenticates the active builder against its exact static Composition, then compiles through the original native `makeView`. Compiled helper functions are cached by the acquired Composition.

An alternate child view retains invariant owner evidence, its Model, and its exact local inputs. The descriptor Binding adds an overload for that authored plan; ordinary native Binding signatures retain their original Message and Mount checks. Native placement, key, generated delivery, and bound view requirements come from one flat `BindingViewContract` projection using the existing native helpers.

At execution, the original registered plan is compiled against the selected child's actual private Composition before the native child boundary is installed. A different private Composition is rejected, including one sharing the owner. Checked host-handler selection copies the same compilation provenance when it derives a native Block. Each acquired graph retains its own compilation context.

The public child contract hides its private Binding inventory. Static checks establish owner, Model, inputs, and key contracts; the selected private Composition's exact identity is checked at runtime. No private dispatch cast or child inventory is required in application code.

## Verification

Run after building Foldkit:

```sh
node internal/layered-constructor/view-composition/verify.mjs
node packages/foldkit/scripts/check-block-type-performance.ts
node packages/foldkit/scripts/check-emitted-declarations.ts
```

The focused verifier checks source contracts, six runtime cases, declaration emission, and physically relocated consumers with `skipLibCheck: false`. The runtime cases cover nested parent and child routing, separate direct occurrences, an explicit view on a child without a default view, a keyed child, and foreign Composition rejection. Both existing Website and UI Showcase alternate-view expressions remain intact; the actual UI Showcase passes its typecheck, 13 existing tests, lint, and Vite build.

Six mutations operate only on copied packages. They remove nested source authentication, widen helper inputs, skip selected view compilation, remove static owner evidence, restore the failing generic native-result projection for viewless children, and reverse the default/alternate view signature order. Each must fail before the restored checks pass.

The reflection control targets the compact `DescriptorBindingFields.embedView` contract. Keeping the native default signature last preserves `Parameters<typeof Binding.embedView>` for extracted default-view helpers. Reversing that intersection makes the unchanged accepted heading/config helpers fail with `TS2322`; the strict consumer also rejects the lost reflected inputs. The earlier native `Extra` mutation no longer changed this descriptor-owned member after Binding compaction.

Latest focused artifacts: `verification/run-s8SeN4`; all source, runtime, emission, strict relocation, six controls, and restored source/runtime checks pass.

The final unchanged seven-fixture compiler gate passes in `compiler-budgets-final.log`: Machine search uses 81,800 instantiations and 18,088 Types; Workspace eight groups uses 4,262,517 and 277,981; wide Subscriptions uses 547,953 and 24,230. Fixture sources and ceilings are unchanged. `canonical-emitted-final.log` records the complete canonical emitted-declaration gate against the real package manifest.

## Compiler investigations

`diagnose.mjs` retains copied-declaration experiments and their per-case logs. These are investigation controls, not alternative supported APIs. Earlier checkpoint references remain within the repository's recorded artifacts.

Three implementation boundaries avoided expanding unrelated consumer graphs:

- `BindingParent` belongs to the core Binding connection evidence module. Core testing no longer imports experimental authorship to recover that owner.
- Shared namespace family authoring uses `Block.makeFamilyDefinition(namespace, config)`. Its original native owner is authenticated through a private registry; the lightweight Namespace does not import the full family authoring module.
- Alternate-view typing reads flat native view channels. Instantiating a second complete Binding to recover those channels exceeded the Machine budget.

The initial nested-helper gate failed because the authored value was not callable. The selected-child gate failed because the raw plan reached a child builder without compilation. The viewless source gate exposed the invalid generic-function inference used by the first metadata projection. All are retained as failing mutation controls or saved diagnostics.
