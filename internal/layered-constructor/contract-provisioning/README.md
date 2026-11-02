# Independently provided chat contract

This runnable reference uses the canonical `foldkit/block`, `foldkit/story`,
and `foldkit/scene` entry points. It keeps typed Definition, Composition, and
Binding authoring while selecting a child implementation through ordinary Effect Layers. The parent
ChatRoom imports [the Composer contract](src/messageComposer/definition.ts),
not its implementation.

The socket transport and application behavior come from the existing
[chat showcase](../showcase-chat/README.md). Browser connections use the existing
WebSocket echo endpoint. Tests supply a controlled WebSocket constructor and use
no network.

## Read the example

| Responsibility                                            | Source                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Independent startup, view, and operation contract         | [Composer Definition](src/messageComposer/definition.ts)                                                                                      |
| Constructor-authored child and scoped setup               | [Composer Block](src/messageComposer/block.ts)                                                                                                |
| Private focus Mount                                       | [mount.ts](src/messageComposer/mount.ts), [view.ts](src/messageComposer/view.ts)                                                              |
| Parent relationships, Submitted policy, deferred input id | [Room Composition](src/chatRoom/composition.ts)                                                                                               |
| Parent transition using a child operation                 | [recordSentMessage](src/chatRoom/steps.ts)                                                                                                    |
| Public socket Service and private ManagedResource         | [Room Definition](src/chatRoom/definition.ts), [ChatSocket](src/chatRoom/chatSocket.ts)                                                       |
| Command, Subscription, ManagedResource handlers           | [command.ts](src/chatRoom/command.ts), [subscription.ts](src/chatRoom/subscription.ts), [managedResource.ts](src/chatRoom/managedResource.ts) |
| Ordinary Layer selection                                  | [provided.ts](src/provided.ts)                                                                                                                |
| Actual public Program execution                           | [runtime.test.ts](test/runtime.test.ts)                                                                                                       |
| Two direct Rooms and a keyed Room                         | [roomCollection.ts](src/roomCollection.ts)                                                                                                    |

`MessageComposerContract` has no implementation Layer. Its operations are
declared with Message constructors: `requestClear` is silent;
`requestSubmit` may emit `Submitted`. Completion supplies those operations, so
the constructor does not repeat an operations map.

ChatRoom declares one `RoomStartup` Schema containing its title and input id.
The parent init produces the child-init context; the Binding's `contextToArgs`
derives the Composer argument when the room initializes. Building the graph does
not initialize a Model or open a socket. Command, Subscription, and
ManagedResource handler constructors still own Service acquisition.

## Verify

Run from this directory with the existing checkout dependencies:

```sh
node check-runtime-dependencies.mjs
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run --config vitest.config.ts
node check-placements.mjs
node check-runtime-mutation.mjs
```

The dependency check requires the app and the built framework packages to use
one physical Effect runtime. Matching version numbers alone are insufficient:
separate Effect copies have separate internal Schema sentinels.

The runtime tests host the provided room through `Program.makeElement`. They
check actual focus, send, reply, timestamping, disconnection, listener cleanup,
and host restoration with fake sockets. The collection also checks independent
occurrences, keyed removal and recreation, and complete disposal. Story and Scene
use ordinary Steps; the graph's construction Scope ends after successful or failed assertions.
The runtime mutation check removes child clearing in a disposable source copy
and requires that same host test to reject the retained draft.

The [placement generator](generate-placements.mjs) copies the complete real
Binding and update expressions into [constructor-local and inline
variants](src/placements.ts). The AST check confirms those expressions stay the
same and includes deliberate changes that it must detect. Regenerate with
`node generate-placements.mjs`, then format the generated file before checking.

The final canonical run passes source checking, all 12 existing tests, the
Binding/update placement equality checks, and the lost-clearing mutation check.
The original inline, local, and extracted expressions and assertions are
unchanged. Results are recorded in [canonical-verification.json](results/canonical-verification.json).
Earlier research declaration output is archived under
`results/pre-canonical-emitted`; it is not part of the active source or a claim
that the retired research runners still pass.

## Costs exposed by this proof

- Startup tuples, view kind, operation channels, and external handler requirements
  become explicit public contract declarations. Private descendant resources
  are closed by the actual Runtime occurrence rather than listed in the contract.
- Each Definition exports a unique Symbol for nominal declaration identity.
  Split-file inferred declarations need to name that Symbol; readable Block
  names may repeat.
- A Binding in the constructor must be the relationship registered by its
  Composition. The inline variant retrieves that same inventory member; creating
  a second identical Binding does not preserve identity.
- A constructor-local parent Step closes over its local Binding. An extracted
  Step can use an extracted Binding directly, as the real `recordSentMessage`
  does. Moving a whole relationship to a new scope requires moving the code that
  refers to that relationship together.
- The controlled lifetime argument on the private Composer factory only observes
  constructor-scope acquisition and release. It adds no application Service or
  mutable workflow state.

This directory is an isolated API proof. It does not migrate an original app,
deploy a chat service, or measure runtime or compiler performance.
