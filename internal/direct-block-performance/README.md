# Direct Block compiler workload adaptation

This records the first frozen direct Layer prototype, before the accepted
Workspace cost adjustment and later type-representation repairs. The measured
failures below are historical evidence. The
[current adoption report](../block-api-simplification/adoption-20261104.md)
owns current verification and the user's budget decision. Rerunning the verifier
creates a separate receipt; it does not update the retained results automatically.

This bounded probe copies the existing deep, wide and Workspace compiler fixtures. It does not edit `packages/foldkit/type-performance`, its generator, the normal measurement script, or any ceiling.

Run after the prototype owner freezes its built package:

```sh
NODE_DISABLE_COMPILE_CACHE=1 node internal/direct-block-performance/verify.mjs
```

The verifier snapshots the prototype's built package into a temporary directory, creates original and adapted fixture copies, and runs the unchanged normal checker for `deep-composition-8`, `wide-composition-100`, `workspace-composition-4` and `workspace-composition-8`. It retains source and declaration hashes, diagnostics, the complete generated sources, explicit contract additions and a receipt. No framework source or live package output is rebuilt. Its private compiler wrapper points at the same installed pinned compiler; no package install is performed.

The adaptation uses `Block.make`, explicit constructor Binding yields and returned `children`, ordinary `makeLayer` outputs, and `Layer.provide` for the child implementations. The original warmup and baseline remain unchanged. Existing constructor body properties and domain variable initializers are compared as TypeScript ASTs, and every original `Expect` assertion remains.

Independent contracts require explicit unique keys, Init tuples, view kinds, message-free facts, operations and ordinary Service bounds. The generated receipt lists each addition. A local `Schema.Never` with dispatching children is not message-free. Operation sources move once from the native completion body to the declaration; their ASTs are compared independently. Control's `selectIssue` operation additionally declares its existing exact `SelectedIssue` OutMessage channel. Schema, Command, Mount, view, child storage, policy and handler bodies are retained.

A passive Block has no selected `EffectsLayer` property. The existing lazy handler Service/Error assertions therefore project the same exact channels from the selected Layer through the prototype's named internal `SelectedLayerFacts` type. This is measurement-only introspection, not proposed application syntax. Model, encoded/Codec, Mount and Program required/provided-Service assertions retain their original checks. The resulting four workloads still contain respectively 10/2/7/11 Blocks and 9/100/16/32 Bindings; Workspace retains 4/8 Mounts.

The results measure compiler work through this prototype's declarations, including coexistence with the original native API. They do not measure latency, prove lifecycle behavior, or establish the cost of a future package surface that removes the legacy API.

## Historical measured result

At this checkpoint, all adapted sources compile with the original assertions.
All four adapted workloads exceed the unchanged ceilings, so that prototype was
not compiler-budget ready.

| Workload    | Original instantiations / Types | Unified Block instantiations / Types |   Unchanged ceiling |
| ----------- | ------------------------------: | -----------------------------------: | ------------------: |
| Deep 8      |                659,046 / 52,666 |                  3,053,157 / 424,199 |  1,152,618 / 55,843 |
| Wide 100    |              1,392,438 / 80,565 |                  5,337,430 / 442,595 | 3,132,298 / 216,662 |
| Workspace 4 |             2,683,623 / 234,232 |               10,685,646 / 1,196,822 | 2,642,699 / 229,173 |
| Workspace 8 |             4,451,559 / 307,857 |               12,048,102 / 1,028,932 | 4,515,010 / 299,721 |

Original deep/wide pass. Original Workspace 4 exceeds both ceilings; Workspace 8 exceeds Types. These original sources are unchanged, so their failures also need resolution.

The final primary receipt is `/private/tmp/foldkit-direct-block-performance-AttDXW/receipt.json`; the concise durable summary is [results.json](./results.json). It records source/config/ceiling hashes, the copied declaration snapshot, the exact pinned TypeScript 7.1.0-beta checker and body/domain/assertion preservation counts. Transformation uses the existing TypeScript 6.0.2 parser API; measurements use the unchanged pinned checker.

### Bounded controls

These operate on separate copies within a completed snapshot, with no production changes. Run each once per snapshot:

```sh
node internal/direct-block-performance/compact-control.mjs SNAPSHOT_DIRECTORY
node internal/direct-block-performance/constructor-control.mjs SNAPSHOT_DIRECTORY
node internal/direct-block-performance/base-constructor-control.mjs SNAPSHOT_DIRECTORY
node internal/direct-block-performance/named-layer-control.mjs SNAPSHOT_DIRECTORY
```

The controls retain every source assertion. A nonzero normal-checker status indicates a ceiling failure when a metrics row is present; `diagnosticFailure` instead means the source did not compile.

- **Measurement witness:** replacing the deep workload's internal facts import with public `Block.Plan` output extraction costs 3,053,281 instantiations / 424,200 Types. The witness is not the dominant cost.
- **Compact Binding inputs:** an identity-returning generic `Pick` retains owner, Schemas, get, and both descriptor/constructor evidence symbols while removing authoring helpers. Deep: 3,058,319 / 424,244; wide: 5,351,345 / 442,624; Workspace 4: 10,711,163 / 1,196,912; Workspace 8: 12,098,458 / 1,029,030. This does not recover cost and is not proposed consumer syntax.
- **Existing contract constructor API:** the matched deep workload uses keyed `makeDefinition`, passive `.contract` Bindings, and the identical `.makeBlock` constructor followed by `.provide(child.layer)`. The prototype's modified `MakeBlock` return leaves child `ContractGraph` requirements unresolved. Restoring only its pre-prototype `DeclaredFacts` return in a copied declaration makes the unchanged Clock/fully-provided assertions pass: 1,835,462 / 251,776, still above budget. The increase from native to unified syntax therefore cannot all be attributed to raw Layer completion.
- **Named Layer return:** replacing only the `MakeLayer` return and its helper with the prototype owner's named interface yields deep 3,050,348 / 424,289. This small change does not recover the ceiling.

The named-interface control reads the owner's current source declarations, so it requires that experimental source change to be present. Each receipt contains the exact copied declaration edits. The existing-constructor control reads the worktree's base `HEAD` return Facts rather than inventing a weaker return. Validation remains enabled.
