# Aggregate handler Layer assessment

## Current API alignment

The initial helper below is a historical prototype, superseded by the approved
owned-registry API. `Definition.makeManagedResources` now returns
`managedResources.layer` for a closed registry whose entries all have attached
handlers. Empty registries expose `Layer.empty`; mixed/host-owned registries
require explicit providers. The key `layer` is now reserved at the owned
registry boundary, and aggregate metadata is non-enumerable and excluded from
resource enumeration. The old helper has no alias.

The exact channel, passivity, identity, union, and lifecycle checks established
below remain requirements for the replacement. The earlier ordinary `layer`
entry acceptance and standalone-helper fixtures are superseded. See the
[current consumer API](composition-feedback-closeout.md#aggregate-managedresource-layers)
and [latest adoption/gates](preview-api-adoption.md).

## Earlier prototype decision

Adopt `ManagedResource.handlersLayer(managedResources)` for the next preview.

The helper accepts the existing closed ManagedResource record and combines every attached lifecycle handler recipe. It does not add a property to the record, reserve a registration key, mutate entries, create another registry, inspect a Block owner, or change Runtime lifecycle behavior. Open index signatures, `any`-erased records, and entries widened to `Layer.Any` cannot prove an exact complete aggregate and are rejected.

Keep Command handler selection explicit. Commands have no equivalent closed owner record. A helper taking individual Command definitions would retain the same list behind another wrapper, while an owner-wide inventory would add unused-constructor and import-order policy. Feature-owned `EffectsLayer` exports and `Layer.mergeAll` remain the Command composition surface.

## Consumer result

The previous websocket-chat root selected its one ManagedResource entry separately:

```ts
export const EffectsLayer = Layer.mergeAll(
  TimestampSentMessage.layer,
  TimestampReceivedMessage.layer,
  SendMessage.layer,
  managedResources.chatSocket.layer,
  subscriptions.layer,
)
```

The adopted split-file consumer passes the registry it already exports:

```ts
export const EffectsLayer = Layer.mergeAll(
  TimestampSentMessage.layer,
  TimestampReceivedMessage.layer,
  SendMessage.layer,
  ManagedResource.handlersLayer(managedResources),
  subscriptions.layer,
)
```

This removes a second inventory when a feature wants every attached resource handler. Selective composition still uses individual entry Layers. A registry containing a host-owned entry uses explicit entry Layers and the original entry's `toLayer` provider.

The dedicated managed-resource-layer example and the active Layers snippet use the same aggregate. The ManagedResource guide documents full, empty, selective, and mixed ownership behavior.

## Contract

| Input                                             | Type behavior                                                                       | Runtime behavior                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Empty record                                      | `Layer.Layer<never>`                                                                | Returns the canonical `Layer.empty` value                        |
| Fully attached record                             | Exact union of every entry Layer's success, constructor error, and Service channels | Combines the existing Layer recipes                              |
| Generic or refined Schema entries                 | Preserves the decoded params and resource value in each handler identity            | Uses the original entries and recipes                            |
| Frozen or sealed record                           | Accepted without widening or normalization                                          | Reads own entries without changing the record                    |
| Registration key named `layer`                    | Remains an ordinary entry key                                                       | Includes that entry's attached Layer                             |
| Lifted or aggregated attached record              | Preserves each entry Layer type                                                     | Uses the preserved original Layer values                         |
| Mixed or host-owned record                        | Rejected because every value must carry an attached Effect Layer                    | An erased call throws at the first key without an attached Layer |
| Open, `any`-erased, or `Layer.Any`-widened record | Rejected because its exact closed channels cannot be recovered                      | An unsafe erased call still validates every registered entry     |
| Malformed erased input or invalid `layer` value   | Outside the accepted input type                                                     | Throws a keyed diagnostic before composition                     |

The aggregate return type is:

```ts
Layer.Layer<
  Layer.Success<EntryLayers>,
  Layer.Error<EntryLayers>,
  Layer.Services<EntryLayers>
>
```

The empty case is separate so it remains `Layer.Layer<never>`. There is no exported type helper; the single new public operation is the useful surface.

## Lifecycle and identity

`handlersLayer` reads all own string properties, including non-enumerable entries, validates each entry through Foldkit's existing definition identity, and passes the existing Layer values to Effect's `Layer.mergeAll`. Symbol keys, open numeric indices, and inherited resource records are rejected rather than silently underproviding the advertised Layer. Ordinary and null-prototype records remain supported. It does not call `acquire`, `release`, `modelToMaybeRequirements`, or a handler constructor. `ManagedResource.lift` now preserves that existing identity on its lifted entry, matching the identity preservation already used by aggregation, binding, and lowering.

Calling the helper is passive. The Runtime still builds selected recipes once in its application Scope. Model eligibility still starts acquisition, changed requirements still release then reacquire, absence still releases, keyed and optional occurrences retain independent scopes, interruption still closes the activation Scope, and generation tracking still excludes stale results. The helper does not register definitions, create identities, inspect owners, complete Blocks, or enumerate lifecycles.

## Verification

Focused source and runtime coverage proves:

- exact success, constructor-error, and ordinary-Service channels;
- refined Schema params and a generic factory retaining literal params and values;
- empty, frozen, sealed, `layer`-keyed, lifted, and aggregated records;
- unchanged entry and Layer identities;
- static and erased-runtime rejection for host-owned and mixed records;
- static rejection for open index signatures, `any`-erased records, and `Layer.Any`-widened entries;
- runtime rejection for structural lookalikes without a registered ManagedResource identity;
- malformed-record and invalid-Layer diagnostics;
- passive helper construction, one handler build, and two independent acquisitions;
- constructor failure propagation; and
- the existing ManagedResource lifecycle suite, including eligibility, interruption, cleanup, and stale-result behavior.

The focused Vitest run passed 49 tests across `handlersLayer.test.ts`, `managedResource.test.ts`, and `managedResourceLifecycle.test.ts`.

Dedicated accepted, rejected, and consumer declaration fixtures passed against source and an isolated canonical package build. The accepted fixture was then emitted and its consumer and rejected cases passed from relocated declarations. The emitted fixture preserves exact handler success, `HandlerBuildFailure`, `HandlerDependency`, an empty Layer, a legal `layer` entry, aggregate/lift types, and a generic literal Schema without casts or repeated generic lists.

Both adopted example source graphs type-check against an isolated build containing the new public export: websocket-chat and managed-resource-layer.

The isolated built JavaScript export also passed a direct Node smoke test for canonical `Layer.empty` identity and structural-lookalike rejection.

An isolated canonical package build with only this API change kept the established core compiler ceilings unchanged:

| Fixture                    | Instantiations |   Ceiling |  Types | Ceiling |
| -------------------------- | -------------: | --------: | -----: | ------: |
| `deep-composition-8`       |        598,654 | 1,152,618 | 51,519 |  55,843 |
| `wide-composition-100`     |      1,153,838 | 3,132,298 | 73,833 | 216,662 |
| `command-requirements-200` |        331,259 | 2,659,415 | 62,031 | 389,460 |

No compiler ceiling changed for this API.

## Limits

The helper deliberately does not build a partial Layer from a mixed registry. Silently omitting host-owned contracts would advertise an incomplete aggregate. Explicit composition is the supported partial-selection path.

The helper accepts the string-keyed record contract used by ManagedResources. It does not discover resource definitions elsewhere, traverse child Blocks, acquire handles, infer host providers, or collect Commands. Symbol-keyed and inherited resource registries are outside the ManagedResource registration record contract and are rejected.

As with every TypeScript API, an explicit assertion to a known-good closed registry type can bypass source validation. Runtime identity and Layer checks still reject structural lookalikes and damaged entries reached through such an unsafe boundary.

## Independent review follow-up

Review found that `Object.entries` omitted non-enumerable and symbol-keyed
entries whose Layer channels appeared in the inferred result. The implementation
now includes every own string property and rejects symbol-keyed or inherited
registries. Source rejection cases cover symbol-only, mixed string/symbol, and
open numeric-index inputs; runtime cases retain closed numeric property names
and null-prototype records.

The new non-enumerable regression passed with the fix. An isolated mutation
replacing `Reflect.ownKeys` with `Object.keys` failed that same test with
`Service not found: foldkit/ManagedResource/ManageHandlersLayerConnection`.
The shared implementation was not modified by the mutation run.

A second source review found that union-valued registries could erase Layer
channels through `keyof`, and alternative entry or nested Layer types could
advertise multiple handlers while providing only one. The aggregate now rejects
alternative registries and compares every entry and Layer constituent against
its complete output/error/Service contract. Entries with different discriminants
but the same Layer contract remain accepted, including generic Schema entries.
The three rejected cases use ordinary typed values without `any` or assertions.
Their `@ts-expect-error` checks failed before the corresponding guards and pass
afterward. Exact accepted-channel assertions cover the same-contract union.
