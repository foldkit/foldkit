# Contract-based Bindings with provided child Layers

## Recommendation

Pursue independent child contracts and Layer-supplied implementations while
retaining Definition, Composition, and Binding builders. The runnable ChatRoom
demonstrates that these pieces work together without threading acquired child
instances through extracted handlers.

Hold the broad migration while library authoring is completed. The public
Program runs two resource-owning ChatRooms and a keyed Room, including removal,
recreation, and cleanup. An authenticated Runtime capability closes their
private descendant resource requirements without repeating those identities in
the parent contract.

The remaining gap is Query's generic handler Services and constructor failures.
The separate generic Choice experiment does not establish those channels. See
the current [readiness report](../READINESS.md) for the evidence, additional
factory-authoring costs, and next steps. InMessages is a separate task.

## Runnable consumer

The [split-file chat consumer](../contract-provisioning/README.md) uses a
Message Composer authored through the constructor API. ChatRoom imports only
its Definition and independent contract. The entry supplies the implementation
Layer. This path has no completed native Block adapter.

The public Program test exercises a private focus Mount, a socket
ManagedResource, send and timestamp Commands, an incoming-message Subscription,
the child OutMessage policy, and disconnection cleanup. Controlled Services
make it independent of the network.

Construction builds the executable graph. It does not initialize Models, open
the socket, or start the Subscription. Initializers run later with startup
arguments. Model conditions govern resource and Subscription occurrences.
Command dependencies are acquired in handler constructors.

## Working API

These fragments come from the runnable consumer, with imports omitted here.
`foldkit/experimental/contracted` is the isolated prototype's namespace, not a
proposed final package name.

### Independent child contract

The [Composer Definition](../contract-provisioning/src/messageComposer/definition.ts)
establishes startup, rendering, and operation contracts before its implementation
is available:

```ts
export const MessageComposerKey = Symbol('MessageComposer')

export const MessageComposerDefinition = Contracted.makeDefinition(
  'MessageComposer',
  {
    key: MessageComposerKey,
    Model,
    Message,
    OutMessage,
    Init: Schema.Tuple([Schema.String]),
    view: { kind: 'Element' },
    operations: {
      requestClear: Message.RequestedClear,
      requestSubmit: {
        message: Message.SubmittedForm,
        outMessage: OutMessage.Submitted,
      },
    },
  },
)

export const MessageComposerContract = MessageComposerDefinition.contract
```

This contract has no default implementation Layer. A Binding to it requires a
provider. Operation mappings are declared once and installed at completion.
`requestClear` promises no OutMessage; `requestSubmit` can emit `Submitted`.

### Parent relationships and portable behavior

The [Room Composition](../contract-provisioning/src/chatRoom/composition.ts)
owns the relationship and its OutMessage policy:

```ts
export const MessageComposerBinding = makeBinding(MessageComposerContract, {
  field: 'messageComposer',
  init: { contextToArgs: ({ inputId }) => [inputId] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(MessageComposerContract, {
    Submitted: ({ text }) => makeCommandsStep(() => [SendMessage({ text })]),
  }),
})

export const ChatRoomComposition = makeComposition({
  bindings: [MessageComposerBinding],
})
```

Parent init produces child-init context from its startup input. `contextToArgs`
is applied when that parent initializes. The input id is not evaluated during
configuration or graph construction.

An [extracted transition](../contract-provisioning/src/chatRoom/steps.ts) uses
the same stable Binding:

```ts
export const recordSentMessage = (text: string) =>
  Update.combineSteps([
    MessageComposerBinding.requestClear(),
    makeCommandsStep(() => [TimestampSentMessage({ text })]),
  ])
```

There is no acquired-instance parameter. The executable graph resolves the
Binding's operation when update applies it.

The [placement proof](../contract-provisioning/src/placements.ts) uses the same
complete Binding and update expressions inline, in constructor-local values,
and in separate modules. Model, Message payloads, init arguments, OutMessages,
and graph-aware view capabilities remain inferred. AST comparison checks
expression equality and rejects deliberate payload and field mutations.

A Binding is an identity-bearing relationship. The constructor must acquire the
one registered by its Composition. The inline variant reads that member from
`Composition.bindings`; creating an identical-looking Binding would declare a
second relationship. Moving a relationship to another scope requires moving
the code referring to that relationship together. An ordinary extracted update
or Step can refer to an extracted Binding directly.

### Constructor and provider

The [Room Block](../contract-provisioning/src/chatRoom/block.ts) acquires its
declared relationship and returns the implementation:

```ts
export const ChatRoomBlock = makeBlock(
  Effect.gen(function* () {
    const messageComposer = yield* MessageComposerBinding

    return {
      children: [messageComposer],
      init,
      update,
      view,
      subscriptions,
      managedResources,
      EffectsLayer,
    }
  }),
)
```

The [entry](../contract-provisioning/src/provided.ts) selects the implementation
through ordinary Layer composition:

```ts
export const ChatRoomLayer = ChatRoomBlock.layer.pipe(
  Layer.provide(MessageComposerBlock.layer),
)
```

The checked descriptor convenience retains those provider requirements and is
accepted by the public Program and scoped testing entry points:

```ts
export const ChatRoomWithComposerBlock = ChatRoomBlock.provide(
  MessageComposerBlock.layer,
)
```

Layers own construction dependencies, sharing, typed failure, and cleanup. They
supply child implementations without a parent implementation import. The parent
Model, Binding, deferred init recipe, and OutMessage policy determine state
placement and runtime behavior.

## Contracts and testing

An independent contract declares information previously inferred at completion:

- Init argument and optional dispatch Context tuple Schemas.
- View kind and optional input Schema.
- Public operation payloads, possible OutMessages, and requirements.
- Lazy handler Service/error bounds and externally supplied resource identities.
- Additional descendant Schema encoding and decoding requirements.

These are stable declared bounds. Selecting an implementation with fewer
requirements does not narrow the independent contract. Constructor errors and
construction requirements are inferred separately on its Layer.

Optional, default, and rest init/Context parameters pass. Init, Context, view,
and Message callbacks retain contextual typing without application casts or
broad annotations. Completion checks actual init/update results, operation
channels, registrations, and aggregate requirements.

A routed-only parent uses `Message: Schema.Never` and `makeUpdate({})`. Its
provided child's generated delivery and OutMessage policy work without an
invented parent Message. A genuinely message-free contract declares
`isMessageFree: true`; completion checks that its full dispatch Schema is empty,
including generated child delivery. Both cases have source and runtime checks.

Story and Scene own graph acquisition and cleanup. Pure tests do not construct
the lazy handler Layer or need socket mocks. Execution tests build real handlers
with controlled Services. Selected implementations retain their exact
Subscription registry for testing; independent contracts and `.get` do not
expose that private registry. [Focused tests](../../../packages/foldkit/src/experimental/contracted/testing.test.ts)
check exact Subscription payloads and requirements, provider isolation,
preservation through `.provide`, and forged-descriptor rejection.

Emitted contracts refer to declared facts without serializing the private
implementation graph. Relocated consumers author a new parent with
`skipLibCheck: false` and no source fallback. Declaration statement sizes are
recorded in [results.json](results.json). They are observations, not new ceilings.

Review caught and corrected conditional-provider requirement loss, contract
provider fact erasure, and union-typed provider ids that conflated distinct
declarations. Deliberately failing controls protect those checks. These were
defects found in the research prototype, not published release reports.

## Remaining limitations

The [ancestor fixture](../contract-provisioning-review/ancestor-resources.ts)
places ChatRoom at `general` and `random`. Both the inferred and independent
parents complete. The native graph retains exact resource scopes, and the
independent contract exposes its authenticated execution capability. The
[resource protocol proof](../runtime-capability/README.md) checks source,
relocated declarations, actual execution, and deliberately failing controls.

Other work required before adoption:

- Independent declarations require an exported unique Symbol. Display names
  may repeat, while providers, authoring plans, and Bindings retain nominal
  identity. The [generic family proof](../query-contract/README.md) integrates
  the experimental provider protocol into the isolated package.
- The [Query and KeyedQuery proof](../query-contract/README.md) now carries
  generic invocation Services, handler-constructor Services and typed failures
  through nonserialized channel declarations and checked host templates.
  Production factory parity, public host-owned Queries and direct leaf tests
  remain required before adopting it across the repository.
- Routed-only parents derive child Context through Binding delivery. Nonempty
  parent dispatch Context is an existing unsupported authoring case, including
  the native API; it is not implicitly forwarded to children.
- Private renderer and Mount authority stay behind the completed default view.
  Arbitrary parent reauthoring of a child's private graph is not offered here.
- Existing compiler ceilings check current API regressions. They do not measure
  a whole app migrated to this configuration. No new editor-latency or rendering
  performance improvement is claimed.

## Verification

Run from `/private/tmp/foldkit-incremental-constructor-20261031` with Node 22:

```sh
node internal/layered-constructor/verify.mjs
```

The integrated verifier includes this proof, independent review, existing
constructor/host/testing consumers, focused framework tests, source and
emitted/relocated consumers, and all seven unchanged compiler budgets. See
[integrated results](../verification/results.json).

The integrated results record the current group results, focused tests, and
unchanged compiler measurements. Earlier prototype measurements are not used
as evidence for the revised implementation.

For only this extension, after building the package:

```sh
node internal/layered-constructor/contract-provisioning-proof/verify.mjs
node internal/layered-constructor/contract-provisioning-review/verify.mjs
```

The focused proof checks source, declarations, relocated consumers, and actual
Programs. Copied-package controls detect validation loss, direct-result Service
loss, contract-fact erasure, owner erasure, literal-id constraint loss, duplicate
keys, duplicate operation declarations, widened inputs, and widened operation
arguments. Consumer controls detect two expression mutations and loss of
clear-draft behavior through the actual Program. See [results.json](results.json),
[verification/](verification/), and the
[independent review](../contract-provisioning-review/REPORT.md).

Work remains isolated. Original apps, shared checkout edits, compiler fixtures,
budgets, and frozen experiments are preserved. There is no broad migration,
commit, push, publication, or completed InMessage work in this proof.
