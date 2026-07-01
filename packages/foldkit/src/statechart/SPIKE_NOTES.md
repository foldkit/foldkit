# Statechart Spike Notes

An exploratory prototype of `foldkit/statechart`: a declarative transition
table that compiles down to a plain `transition(state, message) =>
[nextState, commands]` function, spliced into `update` with `evo`. The
machine state lives in the Model. There is no second runtime. This document
records what survived TypeScript inference, what did not, and whether the
idea is worth pursuing.

Verification status: `pnpm typecheck` and `pnpm lint` pass. All 17 tests in
`statechart.test.ts` and the 27 tests across `examples/` pass, and every
`@ts-expect-error` directive in the test file is consumed (checked with
`tsc -p tsconfig.json`, which includes test files; the build config used by
`pnpm typecheck` excludes them).

## The API that shipped

```ts
const connectionMachine = defineMachine({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketOpened: to(
          'Connected',
          (state, message) => Connected({ sessionId: message.sessionId }),
          (state, message) => [LogTransition({ description: '...' })],
        ),
        SocketErrored: [
          when(
            state => state.attemptCount < MAX_CONNECT_ATTEMPTS,
            to('Reconnecting', state => Reconnecting({ ... })),
          ),
          otherwise(to('Failed', (state, message) => Failed({ ... }))),
        ],
      },
    },
  },
})
```

`machine.transition` has exactly the `update` branch shape.
`machine.step` returns `Transitioned | Ignored`, so dropped messages are
observable rather than silently swallowed. `machine.edges`,
`reachableFrom`, `unreachableStates`, `deadTransitions`, and `toMermaid`
all read the same runtime edge data.

## What held under inference

These all pass `pnpm typecheck` with zero manual annotations in user code:

- Inside `to('Connected', build)` under `Connecting.on.SocketOpened`, `state`
  narrows to exactly the `Connecting` variant and `message` to exactly
  `SocketOpened`. The test proves exact narrowing (not merely "a variant
  with this field") with `const sourceTag: 'Connecting' = state._tag`.
- The same narrowing holds inside `when` predicates, inside `to` calls
  nested under `when` and `otherwise`, and inside the optional `commands`
  callback.
- `to('Connected', () => Disconnected())` is rejected: the build return type
  is checked against the variant named by the target tag. Verified with
  `@ts-expect-error`.
- `to('Loadingg', ...)` (unknown target tag), an unknown state key in the
  table, and an unknown message key under `on` are all rejected. The key
  checks come from excess property checking against the mapped table type.

## What did not hold, and what it cost

### 1. The single-call `defineMachine({ state, message, initial, states })`

The spec called for one config object. It cannot work with inference, and
this is structural, not a tuning problem. When TypeScript infers
`defineMachine`'s type parameters from the `state` and `message` properties,
the nested `to(...)` calls inside `states` are checked during that same
inference pass, while `State` and `Message` are still unresolved variables.
A call expression is not "context sensitive" in TypeScript's sense (only
function literals with unannotated parameters are), so the `to` calls are
not deferred to the second inference round. Their results collapse to the
type parameter constraints and the narrowing is gone.

A micro-probe confirmed the mechanism: the identical `to(...)` call infers
perfectly when its contextual type is concrete (direct assignment, object
literal property, even a union context), and fails only when nested inside
the inferring call.

The fix is the two-stage form, which is also this codebase's existing
pattern for the same problem (`Subscription.make<Model, Message>()(...)`,
`ManagedResource.make<Model, Message>()(...)`, both of whose doc comments
describe exactly this ordering issue):

```ts
defineMachine({ state, message })({ initial, states })
```

Stage one fixes the type parameters from the Schemas. Stage two checks the
table against fully concrete types. Everything downstream works because of
this split.

### 2. Type-level edge precision

The first design encoded the target tag in the `Edge` type itself
(`Edge<State, Message, Source, Trigger, TargetTag>`), so the table position
type was a union of edge types distributed over every possible target tag.
That union is what broke inference: when TypeScript tries to infer `to`'s
type parameters from a contextual union whose constituents differ only in
`TargetTag`, multiple constituents match ambiguously and it bails to the
constraints.

The resolution: the `target`/`build` correlation is enforced only by `to`'s
parameter signature (`build` must return `Variant<State, TargetTag>`), and
the stored `Edge` type keeps `target: TagOf<State>` unspecific. Every
constituent of the table position type then agrees on the inferable type
arguments, and inference succeeds.

What this costs: the type system no longer knows which target each edge
points at, so a type-level reachability analysis is off the table. The
runtime data still has literal target tags, and all the shipped analysis is
runtime anyway, so nothing in the prototype's feature set was lost. But
"the edge set is enumerable at the type level" is not true in the shipped
design, and I could not find a formulation where it is true and inference
survives.

### 3. NoInfer placement is load-bearing and subtle

Three separate inference leaks had to be plugged, each found by a failing
probe:

- `TransitionTable<NoInfer<State>, Message>` breaks entirely: the unreduced
  `NoInfer` wrapper makes `Extract<NoInfer<State>, { _tag: Tag }>` evaluate
  to `never`, so every build callback expected `never`. `NoInfer` must wrap
  whole computed types, never types that feed conditional types.
- `when`/`otherwise` need `NoInfer` on all parameters. Without it, the
  nested `to(...)` result (computed without context during the guard
  helper's own inference) supplies wrong candidates: `State` gets fixed to
  the target variant alone, the source candidate then violates its
  constraint, and the source falls back to the wrong variant.
- `to`'s build return and commands parameter need `NoInfer`. A zero
  parameter build like `() => Idle()` is not context sensitive, so its
  return type participates in round one inference, and TypeScript infers
  into the `Extract` conditional, again fixing `State` to the single target
  variant.

The result works, but it is a Jenga tower: five `NoInfer`s and a two-stage
call, each individually necessary, none discoverable except by probing.
Anyone extending this module needs the probe discipline, not just the types.

### 4. Incidental findings inside the implementation

- Effect's `Array.isArray` declares `(self: unknown)` as its first overload,
  so it cannot narrow `Edge | ReadonlyArray<GuardedEdge>` (the readonly
  array survives the negative branch). A named type guard over
  `globalThis.Array.isArray` was needed.
- `Match.tagsExhaustive` collapses (handlers expected to be `never`) when
  the matched union contains unresolved generic type parameters, which is
  the normal condition inside a generic library function. It is fine in app
  code with concrete unions. The implementation uses plain conditionals on
  `_tag` internally instead.
- Two internal type assertions were unavoidable: widening the precise table
  to a loose `(state: State, message: Message)` view (safe because `step`
  dispatches by the same `_tag` keys the table was built from), and typing
  the tags extracted from the Schema at runtime. Both are single-site and
  eslint-suppressed in the house style.
- Extracting state tags from the union Schema at runtime works via
  `member.fields._tag.schema.literal` (verified by test). `defineMachine`
  throws at definition time if a member is not a TaggedStruct.

## How guards and reachability turned out

Guards are the strongest part of the design. An ordered list of
single-target edges (`when` then `otherwise`) keeps every branch's target a
literal, the first matching guard fires, and a guard list with no match
(all predicates false, no `otherwise`) produces an observable `Ignored`
rather than an implicit no-op. Narrowing inside predicates means backoff
logic reads naturally: `state.attemptCount < MAX_CONNECT_ATTEMPTS` with no
annotations.

Reachability is almost free once edges are data: `reachableFrom` is a ~15
line BFS, `unreachableStates` subtracts it from the Schema-derived tag set,
and `deadTransitions` reports both unreachable-source edges and guards
listed after an `otherwise`. All three are exercised and sound on the
connection example (a deliberately orphaned `Suspended` state is reported
unreachable, and its outgoing edge dead). `toMermaid` is ~20 lines and
emits a complete `stateDiagram-v2` with guard labels. The claim that "viz
falls out of the definition" is simply true.

## Honest cost versus a hand-written `update`

For the connection machine (six states, ten edges, one guard pair), the
table is roughly 80 lines; the equivalent `Match`-based `update` branch
written in house style is roughly 50 to 60. The table costs more lines but
each line carries less logic, and the transitions are data you can audit,
test, and render.

The real costs are not line counts:

- A second vocabulary (`to`, `when`, `otherwise`, two-stage `defineMachine`)
  for something every Foldkit developer already knows how to write with
  `Match`.
- Type errors inside a mistyped table are large structural dumps, far
  noisier than the equivalent error in a plain `update`. The wrong-variant
  rejection works, but its error message spans 20 lines.
- No services channel: edge commands are `Command<Message>` with `R =
never`. The typing-game's update returns commands with an `RpcClient`
  requirement, so this would need an `R` type parameter on `defineMachine`
  before real apps could attach RPC commands to edges. Straightforward, but
  not done.
- The Model field must be exactly the machine's state union, and the
  machine's messages must be a subset of the app's Message union. Both held
  naturally in the integration example (`M.tag` over the machine's message
  tags, then `machine.transition`, then `evo`), which came out to about
  15 lines.

What you get for that cost: ignored messages are explicit and observable
(`step`), dead edges and unreachable states are detectable at boot or in
tests, and the diagram is generated rather than hand-drawn and stale.

## The hierarchy gap

Foldkit has no compound or hierarchical state concept, and neither does this
table. Two honest observations:

- The table shape leaves syntactic room: a state entry could grow `initial`
  and `states` keys for child machines, or a machine-level `parent` map,
  without breaking the current flat form. Nothing in the runtime
  representation (edges as plain records) resists it, and the analysis
  functions would extend by recursion.
- But hierarchy is not a syntax extension, it is a semantics project:
  message bubbling (child handles first, parent as fallback), entering a
  composite state through its initial child, exit and entry ordering, and
  what `Ignored` means when a parent could still handle the message. None
  of that exists in Foldkit today, and the Submodel idiom (parent variant
  carries a child union field, parent `update` delegates and maps
  OutMessages) already covers the same ground in plain code. A hierarchical
  machine would compete with Submodels, not fill a void.

So: no rework needed to add hierarchy later, but also no pressure to. If
hierarchy ever lands it should be designed against Submodels, not bolted
onto this table.

## Where it shines: worked examples

The connection machine above is the canonical demo, but it is mid-tier as a
pitch: a competent developer writes it as a plain `update` branch without
trouble. The cases that actually justify the module live in `examples/`,
each a self-contained test file paired with an analysis markdown
(`examples/README.md` is the index):

- `staleAsyncPruning`: stale completion Messages are dropped by topology
  (the only state with a `SucceededSave` edge is `Saving`), and the
  remaining generation check collapses into a single guard. This replaces
  the scattered request-id checks that are the most reliably forgotten
  defensive code in Elm-architecture apps.
- `dragGesture`: adversarial pointer-event orderings (cancel mid-drag,
  second pointers, release without movement) become a fully decided
  state-by-event matrix, with one test stepping every cell and asserting
  which are `Ignored`.
- `resumableUpload`: protocol legality is the table. Duplicate and racing
  server acknowledgements are observably `Ignored`, and the Commands
  attached to edges form an assertable request sequence, an executable
  stand-in for the protocol's sequence diagram.
- `rowSync`: one machine amortized over every row of a table, with
  `Command.mapMessages` routing results back to the originating row and a
  single analysis pass certifying the lifecycle for all instances. This is
  where the table's fixed cost flips into a clear win.
- `checkoutWizard`: the generated Mermaid diagram is the artifact a PM
  reviews, skip logic is a symmetric guard pair on forward and back
  navigation, and `unreachableStates` catches the orphaned step a flow
  change left behind.

The shared traits, in rough order of strength: a (state, message) matrix
dense with combinations that must be rejected observably; messages arriving
from sources the app does not control (network, pointer hardware, timers)
in orders the happy path never exercises; one machine instantiated many
times; and flows that non-engineers review.

## Recommendation

Worth pursuing, positioned by scenario rather than by state count. The
type-level results are better than expected (exact narrowing with zero
annotations, wrong-variant rejection, typo rejection), and the analysis and
Mermaid output genuinely fall out of the data. For the median Model field a
plain `Match`-based `update` branch remains the right call, and the table
is only a modest improvement there, paid for with a second vocabulary and
an inference Jenga tower someone has to maintain. For the scenarios in
`examples/`, the table is a structural improvement rather than a stylistic
one: it deletes bug classes (stale async results, unhandled event
orderings, drifting flow diagrams) instead of shortening code.

The smallest version worth shipping:

- `defineMachine` (two-stage, as here), `to`, `when`, `otherwise`.
- `transition` and `step` (the `Ignored` observability is a real win and
  costs nothing).
- `edges` and `toMermaid` (the cheapest, most demoable payoff).
- `reachableFrom` / `unreachableStates` / `deadTransitions` (they are ~50
  lines combined and make the "transitions are data" pitch concrete).
- Plus one addition before real use: an `R` (services) type parameter so
  edge commands can require RPC clients.
- Skip hierarchy entirely.

Ship it as an experimental `foldkit/statechart` subpath, document the
two-stage call as a hard requirement with a short explanation of why, and
position it in the docs by trait, not by size. Reach for a Machine when
illegal (state, message) combinations outnumber legal ones and must be
rejected observably, when messages arrive from sources you do not control,
when one machine is instantiated per entity, or when the flow itself is a
review artifact for non-engineers. Stay with plain `update` for toggles,
forms, and any state where most messages mutate data within a state rather
than move between states. The per-row save/conflict machine
(`examples/rowSync.test.ts`) is the motivating example the docs should lead
with, not a connection machine.
