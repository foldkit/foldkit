# Independent contract review

This review covers `experimental/contracted`, the split-file ChatRoom and
Message Composer, portable builder placements, and the focused contract proof.
The lead integrated the fixes below. The current adoption recommendation is in
[READINESS.md](../READINESS.md).

## Provider requirements

A conditional Layer promises only outputs common to every possible branch.
The initial `.provide` implementation subtracted the union of its outputs,
which could erase a child implementation requirement that one branch did not
supply. Both descriptor convenience methods now use guaranteed outputs.

[conditional-provider.ts](conditional-provider.ts) checks foreign providers,
common outputs, additional Service inputs, and typed provider failures. Its
runtime test deliberately executes the source-rejected missing-provider case
and observes the missing child Service. Supplying an unrelated implementation
cannot complete the graph.

## Contextual authorship and native evidence

The declared Context tuple supplies callback inference. The complete update in
[contextual-context.ts](contextual-context.ts) has no callback annotations, and
negative witnesses reject arbitrary properties and incorrect payload types.
Extracted transitions use stable Bindings rather than constructor-instance
parameters.

Completion retains the initializer's original function evidence. Overloaded
and decorated initializers reject rather than being silently normalized into
an apparently compatible function. Native registration and per-Message output
checks run before independent contract validation.

The final review also found a duplicate-operation declaration hidden behind an
optional `Body.operations` property. Runtime acquisition rejected that body,
but the source prohibition checked only a required property. Validation now
collects keys from every Body union member and rejects `operations`, including
optional keys. Source and relocated checks cover optional and union bodies;
a copied-declaration mutation must expose unused rejection assertions.

## Recursive resource ownership

[ancestor-resources.ts](ancestor-resources.ts) places the real ChatRoom contract
at `general` and `random`. Both Bindings retain deferred startup arguments.
The native graph preserves distinct scoped ChatSocket resources. The independent
contract exposes an authenticated Runtime execution capability instead of
requiring private descendant identities in its Configuration.

This resolves the earlier descendant-resource declaration gap. It does not
weaken resource-scope equality or make graph acquisition allocate Model-owned
resources. The public [Room collection](../contract-provisioning/src/roomCollection.ts)
adds two direct Rooms and a Record-keyed Room. Actual Program tests send and
receive independently, remove and recreate the keyed occurrence, and dispose
all remaining sockets and listeners.

The [resource protocol proof](../runtime-capability/README.md) checks the
corresponding source, emitted, relocated, and execution contracts. Its failing
controls cover missing Runtime authority, foreign authority, constructor-phase
access, and invocation phase. Handlers obtain occurrence authority at invocation,
not when their shared Layer is built. This preserves repeated occurrences and
existing interruption and cleanup ownership.

The opaque capability is a public execution bound. It does not claim that every
pure operation uses a resource. Ordinary init, update, and bound operations
remain synchronous after construction.

## Declaration identity

A literal display name alone cannot identify independent declarations. The
initial union-ID probe created different Runtime Services with a shared public
Graph type. Literal-ID checks rejected that case, but equal literal display
names could still conflate declarations.

Each independent Definition now requires an exported unique Symbol. That key
reaches both provider facts and authoring Owners. Same-name, same-Schema
Definitions cannot exchange providers, init/update/view plans, or Bindings.
Runtime capability keys follow canonical Owner identity rather than display
text, so same-name contracts cannot overwrite each other's Context entries.

The Symbol must be exported so inferred declarations can name it. Broad or
union-typed keys reject. Runtime validation rejects reuse of the same key and
permits equal display names with different keys. Source and copied-package
controls protect identity and exact contract facts separately.

## Empty and routed-only dispatch

A genuinely empty contract declares `isMessageFree: true` and completes with
`Message: Schema.Never` and `makeUpdate({})`. Completion checks the full dispatch
Schema, including generated delivery. The [silent proof](../contract-provisioning-proof/src/message-free.ts)
checks source and erased callers. [message-free-leaf.ts](message-free-leaf.ts)
preserves rejection when an empty leaf omits that declaration.

[routed-only.ts](routed-only.ts) completes a parent with no authored Messages
and one nonempty child. Generated delivery updates the child and applies its
OutMessage policy. Its `isMessageFree` fact is false because the completed graph
has generated dispatch.

Child dispatch Context is supplied through
`Binding.delivery.toUpdateContext(parentModel, key?)`. A focused real Story
confirmed the Model-derived value reaches the child; changing that value made
the assertion fail. Parent dispatch Context is not automatically forwarded.
Nonempty parent Context in a routed-only update remains an existing native and
hybrid authoring limitation, including optional/rest parent tuples. This is
separate from supported child Context delivery.

## Recommendation and verification

The ordinary independent-contract path has source, declaration, execution,
and lifecycle evidence. Broad migration is held for actual Query/KeyedQuery
factories: arbitrary handler Services and constructor failures do not fit the
current concrete-key and error-Schema declarations. The generic Choice research
patch is separate and does not establish those channels.

Run the focused review after building the core package:

```sh
node internal/layered-constructor/contract-provisioning-review/verify.mjs
```

The verifier runs five source fixtures and two runtime tests, with logs in
[verification/](verification/). The root-owned
[proof verifier](../contract-provisioning-proof/verify.mjs) covers emitted and
physically relocated consumers and deliberate rejection controls. The
[integrated verifier](../verify.mjs) also checks ordinary consumers, Story/Scene,
Runtime regressions, and unchanged compiler budgets. Current results are in
[verification/results.json](../verification/results.json).

No compiler fixture or budget was relaxed. No broad repository migration or
publication is claimed by this review.
