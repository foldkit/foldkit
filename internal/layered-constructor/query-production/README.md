# Production Query adoption

The production `foldkit/experimental/query` factory now returns the same checked family descriptor exercised by the earlier Query prototype. `Query.layer` supplies the shared implementation. Query declarations remain passive; their Models, local Message constructors, Fetch definition, accessors, and handler recipes are available before acquisition. Pure execution comes from the acquired descriptor.

The public factory covers ordinary and keyed Queries, attached and externally supplied handlers, and silent and notifying completion modes. The old transition implementation remains private for its focused behavior tests. There is no public legacy overload.

## Parent inputs

Query declares `RequestedReset`, `RequestedRevalidation`,
`RequestedRevalidationOrLoad`, `RequestedLoadIfMissing`, and `RequestedCancel`
in its separate InMessage Schema. KeyedQuery declares `RequestedReset` there.
Their receivers call the existing shared transitions directly. Fetch and
interruption results stay in the local Message Schema and enter update.

Binding method signatures stay unchanged. Query retains its positional
`requestLoadIfStale(nowMillis)` adapter. KeyedQuery retains its five
argument-taking adapters, including `requestCancel(args)` and
`requestLoadIfStale(args, nowMillis)`. No local Message bridge was added for the
migrated inputs. Scoped tests use `Story.inMessage` for received requests.

The existing exported `QueryMessage` and `KeyedQueryMessage` types continue to
name the native behavior-test unions. `QueryLocalMessage`,
`KeyedQueryLocalMessage`, `QueryInMessage`, and `KeyedQueryInMessage` name the
new contracts. An application's exact local type remains available from its
descriptor's `Message.Type`.

## Handler selection

`provideHandlers` validates and selects a Layer for the original Fetch definition. Selection can be repeated. Each selected descriptor keeps its original members and contracts. For attached Queries, the descriptor's `EffectsLayer` member continues to name the original attached recipe. The acquired Block's `EffectsLayer` exposes the selected handler channels. Selection never mutates an earlier descriptor.

## Verification

Run the production proof after building Foldkit:

```sh
node internal/layered-constructor/query-production/verify.mjs
```

The verifier copies the built package and active production declaration fixtures, then checks source inference, runtime behavior, declaration emission, and a physically relocated consumer with `skipLibCheck: false`. It deliberately breaks host identity checking, accepted-completion notifications, and the keyed provider on copied packages. Every mutation must fail before the restored baseline passes.

The latest successful run is recorded in `verification/latest.json`. The active declaration fixtures include the full ordinary/keyed, attached/host, and silent/notifying mode matrix. The package tests retain 76 pure implementation cases and five production family cases covering passive construction, accepted keyed notifications, handler reselection, received cancellation, and received reset. The copied-package controls reject foreign host selection, lost notifications, and a missing keyed provider. A generic family fixture also rejects the old redundant receive-plan recheck while preserving the original completion validators.

The complete canonical emitted-declaration suite passed after the production port. Its log is `../block-namespace/query-native-emitted-final.log`. All seven unchanged compiler fixtures passed; the production snapshot recorded 70,397 instantiations / 13,224 Types for Machine and 4,275,262 / 280,636 for Workspace with eight children. Fixture sources and ceilings are unchanged.

### Generic authoring boundary

KeyedQuery's silent and notifying authoring contracts use named interfaces.
The declaration factories retain their exact inferred fields and original
function identities. These interfaces prevent the new generic input contract
from forcing unrelated Machine consumers to expand the entire authoring return
type. The measured Machine delta is 70,759 instantiations / 13,405 Types.

Run the copied declaration control after building Foldkit:

```sh
node internal/layered-constructor/query-production/review/compiler-boundary.mjs
```

It measures the unchanged Machine fixture, restores the prior inline authoring
representation in a copied package, and requires that representation to exceed
the unchanged budget. Restoring the named boundary must recover the original
counts. The control does not change canonical declarations, fixtures, or budgets.

## Deliberate boundaries

- `native.ts` and `nativeDefine.ts` are private behavior-test seams. They are not package exports.
- `QueryKey` and `KeyedQueryKey` have public type-only names so downstream declaration emission can refer to the nominal identities. Their runtime values remain private.
- The earlier Query prototype and its frozen measurements remain historical evidence. The production verifier imports the real public entrypoint.
