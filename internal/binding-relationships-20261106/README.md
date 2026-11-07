# Explicit Binding relationships

The prototype makes the storage relationship visible at its declaration. The
parent owns the Model and membership; a Binding describes the connection,
delivery and OutMessage policy. The existing Composition and Layer architecture
is unchanged.

The user approved adoption and the exact measured revision of the two Workspace
compiler ceilings. The adoption branch is `codex/explicit-binding-adoption-20261106`,
based on the byte-identical integrated preparation commit `d782b73e62c95a1bfba60c11bbfdaf99c496b153`.
Repository-wide migration and source/emitted/runtime verification pass. The frozen
[rendering comparison](rendering/README.md) is complete. Package push gates and
exact-commit review remain pending. Publication is held.

## Public API

All constructors belong to the parent Block and remain detachable typed values.

| Constructor                     | Parent storage                                                    |
| ------------------------------- | ----------------------------------------------------------------- |
| `makeRequiredFieldBinding`      | One exact required child Model field                              |
| `makeOptionalFieldBinding`      | Required `Option<ChildModel>` field                               |
| `makeOptionalKeyedFieldBinding` | Required Option containing a closed keyed wrapper                 |
| `makeKeyedArrayBinding`         | Required array of keyed children or closed keyed wrappers         |
| `makeRecordBinding`             | Required Record, optionally projecting a wrapper's `childField`   |
| `makeHashMapBinding`            | Required Effect HashMap, with the same wrapper projection         |
| `makeCustomBinding`             | Unkeyed `read` and `write`                                        |
| `makeCustomKeyedBinding`        | `readAll`, `key`, `read` and `writeAt`; delivery adds `keySchema` |
| `makeVariantBinding`            | One complete child Model member of the parent's tagged union      |

Custom keyed children with generated Message delivery require `keySchema`. Message-free children omit both `keySchema` and `delivery`; their `key` callback still establishes the exact occurrence-key type.

Implicit `makeBinding`, shared `makeMapBinding`, and the standalone variant
constructor are removed from the public authoring surface. The canonical methods
select existing private lowering implementations; erased callers cannot reach
those implementations through the removed public properties.

The user-approved helper path is `foldkit/binding`, replacing
`foldkit/bindingInit`. It currently exposes `initAndSet`, `initAndAppend`,
`initAndInsert` and `makeInitIfMissingStep`. Relationship constructors stay on
the parent Block.

## Storage and activity

`activeWhen` replaces `presentWhen` with its existing semantics. A false predicate
deactivates the whole direct child occurrence while retaining its stored Model.
It affects delivery, connected operations and Model-driven Subscriptions,
ManagedResources and Mounts. It does not decide rendering or rebuild the static
construction Layer.

The narrower gates remain distinct: `delivery.when` controls incoming Message
delivery, while `subscriptions.when` controls Subscription Streams. Custom
accessors already express presence through their reader. This prototype does
not extend whole-occurrence predicates to storage forms that did not previously
support them.

## Real consumers

Typing Game Home previously used:

```ts
const HomeBinding = makeBinding(HomeBlock, {
  field: 'home',
  presentWhen: model => ApplicationRoute.guards.Home(model.route),
})
```

The prototype uses:

```ts
const HomeBinding = makeRequiredFieldBinding(HomeBlock, {
  field: 'home',
  activeWhen: model => ApplicationRoute.guards.Home(model.route),
})
```

Its Room declaration now names the independent optional and keyed properties:

```ts
const MaybeRoomInstanceBinding = makeOptionalKeyedFieldBinding(RoomBlock, {
  field: 'maybeRoomInstance',
  key: 'roomId',
  childField: 'model',
  // Existing delivery context and Subscription gates remain on this Binding.
})
```

Workspace's issue editors are Records, not arrays. Its declaration becomes
`makeRecordBinding(IssueDetailBlock, { field: 'issueDetails', ... })`, preserving
its existing contextual delivery and OutMessage policy. Actual array evidence
comes from Counters and Toast, including parent-owned wrappers and Instance
creation. No application Model changed to fit the spelling.

## Verification

- Core build passes. Typing Game, Workspace and Counters typechecks pass.
- Existing Typing Game Stories, Workspace Stories/Scenes, Counters tests and
  focused Core storage/lifecycle tests exercise the prototype relationships.
- The generic Toast wrapped-array consumer passes an isolated source typecheck.
- Source and relocated emitted consumers pass on TypeScript 6.0.3 and
  7.1.0-beta. They exercise all nine forms, detached builders, exact keys, init
  context, OutMessage policy and registration. A completed parent proves exact
  Command requirements, Services and constructor errors; omitting those bounds
  is rejected. [Prototype declaration receipts](declaration-proof.json). The adoption rerun
  also checks constructor-authored custom keyed dispatch context with plain
  tuple literals. [The final source receipt](adoption-source.log) and
  [relocated declaration receipt](adoption-declarations.log) record the adopted
  signatures; the failing pre-fix capture formerly named `source-proof.current.log`
  has been removed.
- Runtime shape tests reject erased relationship mismatches without evaluating
  init, predicates or accessors. A mutation that bypassed container
  discrimination failed the two corresponding tests before restoration.
- A required child's own Model can itself be an Option, array, Record or HashMap.
  This does not turn it into optional or collection storage.
- Exact Schema identity for whole variants remains runtime-validated. TypeScript
  cannot distinguish separately constructed, structurally identical Schemas.

## Compiler measurements

The eight existing workloads keep their graph shapes, policies, Commands and
validation. Only Binding constructor identifiers change. The original proof ran
against unchanged budgets; its final cleaned run is
`prototype-performance.no-implicit-exports.log`, using the repository's native
TypeScript 7.1.0-beta compiler and single-threaded checker.

| Fixture           | Baseline instantiations | Prototype | Baseline types | Prototype |
| ----------------- | ----------------------: | --------: | -------------: | --------: |
| Deep eight        |                 671,225 |   668,962 |         54,305 |    54,028 |
| Wide 100          |               1,407,702 | 1,399,757 |         81,772 |    81,490 |
| Commands 200      |                 345,597 |   344,558 |         64,468 |    64,167 |
| Subscriptions 100 |                 548,134 |   548,136 |         23,593 |    23,588 |
| Workspace four    |               1,604,687 | 1,609,171 |        116,418 |   117,873 |
| Workspace eight   |               2,778,703 | 2,787,171 |        157,971 |   160,966 |
| Machine search    |                  69,558 |    69,498 |         13,180 |    13,132 |
| Attribute bundles |                 114,226 |   114,226 |         29,369 |    29,369 |

In that original proof, six fixtures passed. Workspace four exceeded its ceilings by 0.28% instantiations
and 1.25% types; Workspace eight by 0.30% and 1.90%. These are checker counters,
not measured editor latency or browser rendering regressions. Other existing
budgets have headroom, so a two-instantiation Subscription increase still passes.

The final encoding reuses the existing exact storage validator and does not
validate callback-bearing inferred configs twice. Named interfaces preserve
portable declarations. Registered graph checks avoid carrying relationship
authoring factories where they are not needed. The original proof did not meet the two Workspace ceilings; this does not
establish a universal TypeScript limitation.

The user subsequently approved setting only those two fixtures' instantiation
and type ceilings to the exact measured prototype counts above. All other
limits and every workload graph are unchanged. The adopted implementation
passes all eight fixtures with those approved limits; see
[the adoption run](adoption-performance.log). These checker-counter approvals
do not approve or characterize browser rendering performance.

## Run the focused proof

Run from the repository root with its supported Node and pnpm versions:

```sh
pnpm --filter foldkit exec tsc -p tsconfig.build.json
pnpm --filter foldkit exec tsc -p declaration-tests/tsconfig.binding-relationships.source.json
node internal/binding-relationships-20261106/check-declarations.mjs
pnpm --filter @typing-game/client typecheck
pnpm --filter workspace-example typecheck
pnpm --filter counters-example typecheck
pnpm --filter @foldkit/ui exec tsc -p ../../internal/binding-relationships-20261106/tsconfig.toast.json
pnpm --filter foldkit check:block-type-performance
```

The declaration driver creates independent emitting and relocated consumer
projects against the built public package, using both installed compilers. It
also removes the expected missing-effects error, verifies that completion is
rejected for that exact contract, restores the case and verifies green again.
It cleans up its own temporary projects. The compiler-performance command gates the approved limits; additional budget
changes require separate review.

## Release state

Repository-wide adoption is based on preparation PR #1901's integrated commit
`d782b73e62c95a1bfba60c11bbfdaf99c496b153`. The existing release-preparation
snapshot passed its protected checks and authorized security review. The new
Binding runtime and migration are outside that reviewed snapshot.

Finish source/emitted, runtime, lint, application and package verification, then
freeze and review the complete candidate. A fresh Daybreak transfer needs
applicable authorization. Publication and announcements remain held for the
user's separate approval.
