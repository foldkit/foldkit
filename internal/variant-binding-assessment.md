# Tagged-union child storage

## Decision and consumer scope

Adopt `makeVariantBinding` as an opt-in export from `foldkit/variantBinding` for a completed child whose entire Model is one tagged member of the parent Model. The helper removes the exhaustive `Option` reader and identity writer otherwise repeated at each such Binding. The Auth example supplies two concrete sites, LoggedIn and LoggedOut. The repository assessment identified no other eligible whole-variant consumers; broader migration is unnecessary.

Auth declares its parent Model with `Schema.Union([LoggedOutBlock.Model, LoggedInBlock.Model])`. Its split Binding modules now use:

```ts
import { makeVariantBinding } from 'foldkit/variantBinding'

export const LoggedInBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedInBlock,
).withOutMessagePolicy({ fold: foldLoggedInOutMessage })
```

The LoggedOut Binding has the same shape. The existing OutMessage policies, init calls and Commands are unchanged. Default placement is the child owner ID, matching both previous accessor Bindings. The helper adds no consumer casts, generic arguments or repeated tag strings.

## Contract and limits

- The parent Schema declares a finite tuple of closed, distinctly tagged members. Each `_tag` is required and has one literal string value. The child Model type equals one complete member.
- The actual child `Block.Model` Schema value must appear directly in the parent's `Schema.Union`. TypeScript cannot distinguish separately constructed, structurally identical unbranded Schemas. Runtime validates Schema value identity, including separate Schemas with different checks or refinements.
- A matching tag establishes presence. Other variants remain parent-owned. The parent chooses initialization and transitions between variants; the helper does not initialize an absent child.
- The optional configuration supports `placement`, `subscriptions` and `delivery`. Subscription gates control Streams without removing the child occurrence. Delivery context receives the whole parent Model and returns the child's exact context tuple, including optional, defaulted and rest parameters.
- Wrapped child fields, keyed collections, partial or widened child types, custom writers and different storage relationships use the existing Binding accessors or other storage helpers.
- Source checks reject mixed accessor configuration, malformed nested options, unknown Subscription keys and the registry's aggregate `.layer` metadata. Runtime validates plain option records, supported keys and callback values without invoking callbacks during configuration. Arbitrary JavaScript callback return semantics are not statically recoverable after type erasure.

The result is the native Binding, retaining its operations, exact Command and OutMessage channels, registration evidence, dynamic `Binding.init`, policies, generations and lifecycle. No ordinary `makeBinding` overload changes.

## Verification

The implementation was frozen and independently reviewed before integration. The final isolated source and built declarations passed:

- Full core source checking and a forced package build.
- Focused source checks with 61 rejected cases and two consumer rejection controls. These include Model/tag eligibility, exact operations and requirements, foreign registration, nested options and all supported update-context tuple forms.
- Producer declaration emission from an external package, followed by strict relocated consumption with `skipLibCheck: false`, copied package declarations and no producer or framework source.
- Nine runtime tests covering explicit init and child Commands; absent identity; tag A → B → A generation replacement and stale-result rejection; Stream lifecycle; Subscription gating without membership changes; observable delivery gating; current-parent context mapping; foreign registration; and erased Schema/configuration rejection.
- The existing Auth scene test with both migrated Bindings.

Independent review repeated the focused source, external declaration/relocation and nine runtime checks successfully.

### Mutation evidence

The durable gates were run against temporary mutations outside the immutable review pin, then the original source was restored byte-for-byte.

| Removed guard                             | Observed failure                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Non-inferred options validation           | 20 unused negative directives, including malformed nested options and narrow/nonboolean whole-parent Subscription gates |
| Runtime supported-key validation          | Missing expected exception for malformed nested options                                                                 |
| Runtime plain-record prototype validation | Missing expected exception for a non-record container                                                                   |
| Helper delivery callback validation       | Missing helper diagnostic; native Binding validation independently rejected the callback                                |

The last mutation proves the helper diagnostic boundary, not that native callback rejection depends on it. Restored focused source and all nine runtime tests passed.

## Compiler and maintenance cost

The separate entry keeps the helper out of ordinary Binding overload resolution. All five unchanged compiler ceilings pass with identical fixture deltas:

| Fixture              | Instantiations |   Types |
| -------------------- | -------------: | ------: |
| Deep composition     |        589,591 |  50,942 |
| Wide composition     |      1,150,837 |  73,038 |
| Command requirements |        329,540 |  61,630 |
| Workspace 4          |      2,508,880 | 205,701 |
| Workspace 8          |      4,247,840 | 279,494 |

The final paired Auth check changes only its two Binding declarations against the same package artifacts:

| Auth encoding    | Instantiations |         Types |
| ---------------- | -------------: | ------------: |
| Native accessors |      1,207,115 |       163,776 |
| Variant helper   |      1,283,229 |       167,117 |
| Added cost       | 76,114 (+6.3%) | 3,341 (+2.0%) |

A bounded flat-model scaling check compares equivalent native and helper graphs:

| Variants | Native instantiations | Helper instantiations | Native Types | Helper Types |
| -------- | --------------------: | --------------------: | -----------: | -----------: |
| 4        |             1,303,744 |             1,445,986 |      231,608 |      250,645 |
| 8        |             1,394,772 |             1,540,081 |      237,607 |      259,088 |

The helper adds 142,242 instantiations at four variants and 145,309 at eight. Doubling the graph adds 91,028 native instantiations and 94,095 helper instantiations. This bounded comparison found mostly fixed overhead; it does not establish arbitrary graph scaling. No ceiling was raised.

The final Auth pair recorded native check times of 0.277/0.268 seconds and process wall times of 6.110/6.153 seconds before/after adoption. One pair does not establish a latency trend or editor improvement.

The implementation is 426 lines, with a 598-line runtime test and focused declaration fixtures. Maintenance includes Schema eligibility, options validation and adaptation to the existing Binding contract. This is a deliberate opt-in cost for removing repeated whole-variant wiring. Ordinary fixtures incur no measured count change.

## Evidence identity

The immutable review tree is `/private/tmp/foldkit-variant-binding-final-pin-20261025`; `MANIFEST.json` records all 16 patch files and their hashes. The source patch is `/private/tmp/foldkit-variant-binding-final-20261025.patch`, SHA256 `daf773d92cd9a33f9e8480274195ac110dc55513353d22285362db64e30833ab`.

- Helper source: `3f8234ef503cadf3e4e96866d4beb823ce9a8ef175d7f3a1b5f4a2293036e0c3`.
- Helper declarations: `f9d3e7118996eaf0e4ef38e3c6cd8864f6157beb9b87b4491876f1eac85fd863`.
- Runtime test: `e0bbeecdcc25590fa1a0e1c15988e53311b9056b8e46148d29feb33a4c7da920`.

Raw source/emission/runtime logs, `final-counts.json`, scaling fixtures and `mutation/summary.json` are under `/private/tmp/foldkit-variant-binding-assessment-20261025/evidence`. The shared declaration harness enrolls the accepted, rejected and relocated-consumer group; combined integration gates are owned by the final source freeze.
