# Child creation through explicit Bindings

## Scope

This API lets an explicit Binding describe a new child occurrence
without making the application place its initialized Model or collect its init
Commands. The parent chooses membership and keys. The registered graph resolves
the creation request synchronously before the next Step reads the Model.

The implementation was developed in `/private/tmp/foldkit-binding-occurrences-20261103`, on
`codex/binding-occurrences-spike-20261103`, based on
`4e4de7d150bfab508dd02dd9146bc0d8c14664bf`. Concurrent shared checkouts are
preserved. The user approved adoption after the isolated proof.
The [adoption report](ADOPTION.md) records the subsequent integration, consumer
inventory, and verification. Publication and Daybreak review are on hold.

This proof does not resolve the separate
[unified Block and direct Layer completion investigation](../block-api-simplification/README.md).

## Consumer API

The [split Counter consumer](../../packages/foldkit/src/test/apps/childInstances/block.ts)
uses a child with an init Command, an InMessage, an OutMessage, a Subscription,
a request Service, and an Element view.

```ts
const Model = Schema.Struct({
  counters: Schema.Array(CounterBlock.Instance),
  summary: Schema.Number,
  lastChangedCount: Schema.Number,
})
type Model = typeof Model.Type

export const CountersBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counters',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (_key, outMessage) =>
    ApplicationDefinition.makeOutMessageFold(CounterBlock, {
      ChangedCount: ({ count }) =>
        makeFieldsStep(() => ({
          lastChangedCount: () => count,
        })),
    })(outMessage),
})

export const addCounter = (key: string, count: number) =>
  makeFieldsStep(() => ({
    counters: Array.append(CountersBinding.create({ key, args: [count] })),
  }))

export const update = ApplicationComposition.makeUpdate({
  ClickedAddCounter: makeFieldsStep((_model, { key, count }) => ({
    counters: Array.append(CountersBinding.create({ key, args: [count] })),
  })),
  ClickedAddAndIncrement: makeStep((_model, { key, count }) =>
    Update.combineSteps([
      addCounter(key, count),
      CountersBinding.requestIncrement(key),
      summarizeCounters,
    ]),
  ),
  ClickedRemoveCounter: makeFieldsStep.fromMessage(({ key }) => ({
    counters: Array.filter(counter => counter.key !== key),
  })),
})
```

The application still registers `CountersBinding` in Composition, yields it in
the Block constructor, and provides the child's implementation Layer. Creation
does not introduce another graph or provider path.

The complete files separate the child contract and implementation, parent
Definition, Composition, extracted transitions, and completion. Inline
Model-aware and payload-only producers retain exact Message inference. The
extracted `addCounter` uses the same expression with meaningful factory inputs;
it requires no acquired child instance, result annotation, cast, or generic list.

### Existing Counters example

The isolated [Counters application trial](../../examples/counters/src/application.ts)
uses one transition for both startup and later additions:

```ts
const addCounter = makeFieldsStep(model => ({
  counters: Array.append(
    CountersBinding.create({
      key: `counter-${model.nextCounterId}`,
      args: [],
    }),
  ),
  nextCounterId: Number.increment,
}))

export const init = ApplicationComposition.makeInit(() => ({
  model: { counters: [], nextCounterId: 0 },
  steps: Array.makeBy(INITIAL_COUNTER_COUNT, () => addCounter),
}))
```

`ClickedAddCounter` references `addCounter` directly. Each startup Step reads the
updated counter ID from the preceding Step. The application removes its custom
Instance Schema, `init.instances`/`toItem` mapping, and manual
`Binding.init`/`toParentModel` writer. All 13 existing Story and Scene cases pass,
along with typechecking and the production Vite build.

The storage changes from `{ id, counter }` to `{ key, model }`. Prebuilt test
fixtures use `CounterBlock.Instance.make({ key, model })` to establish the ready
child's nominal ownership. Existing Messages and visible interactions are
unchanged. The [consumer inventory](adoption-inventory.md) explains why the other
applications retain their existing storage.

### Differences from the sketch

- The ready Schema is `CounterBlock.Instance`. Its value is `{ key, model }`.
- The Binding config explicitly supplies `key: 'key'` and `childField: 'model'`.
  Inferring these from the Instance Schema is not implemented.
- `Binding.create({ key, args })` returns an inert write request, not an Instance.
  Only the owning `makeFieldsStep` can place it in that Binding's Instance field.
- Views use the existing `embedView({ key, slotId, model })` call. There is no
  `embedView({ instance })` overload in this proof.
- The proof covers top-level standard arrays with string keys. Optional fields,
  Records, HashMaps, and custom wrappers use the existing initialization APIs.

## Initialization and ownership

Calling `create` captures the original Binding, field, key, and a snapshot of
the initializer argument tuple. It does not call init, acquire dependencies,
execute Commands, or start a lifecycle. The tuple snapshot is shallow; ordinary
immutable application values remain the caller's responsibility.

When an acquired executable applies the field Step, the resolver checks the
registered connection and parent field, preflights the creation batch, and uses
the existing Binding init path. It inserts ready Instances and returns every
child init Command. A later Step in the same `combineSteps` can immediately call
the child's bound operation and read its initialized Model.

The normal Runtime then owns Command execution and Model-driven occurrence
lifecycles. Handler constructors acquire request Services. Removing an Instance
retires its Subscription and Command origin through the existing Runtime.
Reintroducing its key in a later update creates a fresh occurrence generation.
Removing and reintroducing a key within one update does not promise a new
generation: identity follows the published Model reconciliation.

Only fields declared with `Schema.Array(ChildBlock.Instance)` participate.
Ordinary data arrays are not searched for requests, including arrays of Unknown
values. A token stored as opaque domain data stays domain data. Schema metadata
identifies the opted-in fields during passive Definition construction; no
authoring symbols are encoded into ready Models or JSON snapshots.

Creation rejects duplicate keys, attempts to replace an existing key, another
parent's Binding, another child contract, another field, disconnected requests,
and forged pending entries. Ready retained entries preserve object identity.
Decoding a ready snapshot does not rerun init.

## Tradeoffs

Creation-bearing `makeFieldsStep` results can contribute child init Commands.
They are opaque connected recipes until interpreted by the registered graph.
Plain field changes retain readable Model-only returns and unchanged Model
identity for empty transformations. This distinction is visible in the types.

The read side stays ready-only. A Model field is not a `Pending | Ready` union,
selectors need no status checks, and ordinary `Model.make` or `modifyFields`
cannot accept creation requests. Code holding a creation request cannot read
its child's Model. Code in the following Step can.

The framework pays for a separate typed write contract, authenticated request
metadata, and synchronous batch resolution. This is justified by eliminating
repeated child Model placement and Command lifting. The Counters trial supports
that benefit; more involved applications should guide any additional storage
shapes.

The existing `initAndAppend` already places children and retains init Commands
through a declared `init.toItem` projection. `create` adds ordinary collection
transforms and sibling field changes in one field Step, and lets startup reuse
that same transition without a separate startup mapping. Features already using
custom wrappers or a child-owned ID can use the existing helpers without
introducing a standard wrapper solely to adopt this API.

## Initial proof verification

Run from the worktree with its declared Node and pnpm versions:

```sh
pnpm --filter foldkit build
pnpm --filter @foldkit/ui --filter @foldkit/vite-plugin --filter @foldkit/devtools build
node packages/foldkit/node_modules/typescript/bin/tsc -p packages/foldkit/tsconfig.json --noEmit
pnpm --filter foldkit exec vitest run src/test/apps/childInstances src/block/instanceSchema.test.ts src/block/fieldStep.test.ts src/block/bindingInitialization.test.ts src/block/initRecipe.test.ts src/block/initialization.test.ts src/runtime/occurrenceCancellation.test.ts src/runtime/compositionRuntime.test.ts
pnpm --filter foldkit check:child-instances
FOLDKIT_OCCURRENCE_COMPILER="$PWD/node_modules/typescript/lib/tsc.js" pnpm --filter foldkit check:child-instances
pnpm --filter foldkit check:block-type-performance
pnpm --filter counters-example typecheck
pnpm --filter counters-example test
pnpm --filter counters-example exec vite build
```

The consumer checker copies the complete split-file program and rewrites its
framework imports to public package paths. Its installed library copy contains
only the package manifest and `dist`, so built checks cannot resolve against
library source. It checks source and built public types, emits the consumer's
declarations, relocates those declarations, and checks a new importing consumer.
Declaration checking is enabled
(`skipLibCheck: false`) with strict optional-property and indexed-access checks.
Its negative control removes rejection directives and requires actual compiler
errors. Both TypeScript 7.1.0-beta and 6.0.3 are exercised.

The focused runtime set contains 80 tests in 12 files. It covers same-update
initialization and child operations, OutMessage routing, Story Command
resolution, Scene rendering, startup-context deferral, serialization,
Subscription cleanup, retired Command origins, and ordinary data/operation
compatibility. The source checks cover exact init tuples, Message inference,
ready Model reads, parent/field/child ownership, discarded initialization
evidence, and missing registration.

Three deliberate implementation mutations were observed to fail their focused
regressions, then restored:

1. Dropping child init Commands fails the same-update initialization test.
2. Scanning ordinary arrays fails the opaque-domain-data test.
3. Disabling duplicate-key rejection fails the creation preflight test.

All seven unchanged compiler workloads and ceilings pass with the pinned
TypeScript 7.1.0-beta compiler:

| Workload                 | Instantiations / ceiling |   Types / ceiling |
| ------------------------ | -----------------------: | ----------------: |
| Deep 8                   |      659,031 / 1,152,618 |   52,673 / 55,843 |
| Wide 100                 |    1,392,425 / 3,132,298 |  80,575 / 216,662 |
| Command requirements 200 |      340,252 / 2,659,415 |  63,182 / 389,460 |
| Subscriptions 100        |        548,577 / 548,740 |   24,507 / 24,583 |
| Workspace 4              |    2,561,461 / 2,642,699 | 210,165 / 229,173 |
| Workspace 8              |    4,330,353 / 4,515,010 | 283,966 / 299,721 |
| Machine search           |          70,759 / 83,700 |   13,405 / 18,800 |

Public `ChildInstance` and `InstanceSchema` declarations live in the canonical
Block module. Forwarding their declarations through reexports increased
Workspace 4 to 2,685,074 instantiations and 234,517 Types. Moving the canonical
type declarations to the public module preserves declaration portability and
passes the original ceilings. The storage checks and initialization evidence
are identical in both measurements.

Independent review found no remaining issue in the framework boundary or the
Counters trial. It specifically reviewed ordinary arrays as data, the `create`
operation collision, ready Schema ownership, same-update resolution, deferred
startup ID allocation, keyed routing, and seeded fixture costs.

This initial verification does not include a repository-wide app migration, browser
rendering benchmark, editor latency study, packed installation, release
rehearsal, or Daybreak transfer.

## Review checklist

- [x] Use explicit Bindings and existing Layer construction.
- [x] Preserve portable inline and extracted builders without extra plumbing.
- [x] Keep Model snapshots ready-only and serializable.
- [x] Preserve initialization Commands, registration, and occurrence routing.
- [x] Exercise same-update reads, OutMessages, Subscriptions, and cleanup.
- [x] Restrict resolution to opted-in Instance fields.
- [x] Watch runtime and type rejection controls fail.
- [x] Record final compiler measurements under the unchanged ceilings.
- [x] Complete independent review of the final opt-in and type boundaries.
- [x] Trial the reviewed API in one existing example before broad adoption.

## Recommendation

Pursue this as a focused initialization primitive on explicit Bindings. It removes
the repetitive Model placement and Command collection while preserving the
relationship declaration and ordinary ready-state selectors. The pending write
request is useful because it gives the framework a precise point to initialize
the child before the next synchronous operation.

The user selected the explicit Binding form for adoption. Field-only Binding
configuration and an Instance view overload are not part of this addition.
The repository audit retains other initialization paths where the application
owns a domain ID, optional state, map membership, or additional wrapper data.
The separate Block completion proof remains unresolved.
