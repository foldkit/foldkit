# Machine

:::Warning{label="Experimental"}
Machine ships from `foldkit/experimental`. Its core model is usable today, but names and types may change before the module moves into Foldkit's stable API.
:::

## When to Use a Machine {#overview}

Use a Machine when the same [Message](/core/messages) should change a [Model](/core/model) field differently depending on that field's current state, and you want those rules collected in one transition table. In a checkout, `ClickedContinue` may move Cart to Shipping, Shipping to Payment, and Payment to Review. Reading the table shows every allowed source, Message, and target together.

A Machine is not necessary just because a Model field is a discriminated union. It earns its extra structure when the application has to define and trace the legal transitions: a checkout, onboarding sequence, approval process, connection lifecycle, or another flow whose legal moves take real tracing to answer. A discriminated union and an exhaustive Message match remain the default for smaller flows.

[AsyncData](/core/async-data) has several states, but it should not be rebuilt as a Machine. Helpers such as `revalidateOrLoad`, `revalidate`, `loadIfMissing`, and `settle` already decide its legal transitions. Callers state the operation they want instead of defining Edges and guards themselves. Rebuilding that policy as a Machine would replace a focused `AsyncData` API with the lower-level transition table that the API already saves you from writing.

## Define a Machine

A Machine starts with Schema-backed state and Message unions. The state union describes the possible phases. The Message union describes the facts that may move the flow between them.

::Snippet{name="machineDefinition" label="Machine definition"}

`Machine.define` has two calls on purpose. The first fixes the state and Message types. The second checks the initial state and transition table after those types are known. That ordering lets TypeScript narrow `state` and `message` from an Edge's position: inside `Cart.on.SelectedEdition`, they are the `Cart` and `SelectedEdition` variants rather than their full unions.

Import the Machine namespace from `foldkit/experimental` and its Edge constructors from `foldkit/experimental/machine`:

::Snippet{name="machineImports" label="Machine imports"}

### Edges and Commands

`to(target, handler)` declares one Edge. Its handler returns the same shape as update: the target state in `model` and any transition-time Commands in `commands`. The target constructor must match the target tag.

::Snippet{name="machineEdge" label="Edge with a Command"}

`'Placing'` has to be explicit because the Machine needs to know an Edge's target without running its handler. That is what makes graph analysis possible. The target tag also tells TypeScript that the handler must return the `Placing` state variant.

The handler receives one record. Destructure only what the Edge needs:

- `state` is the source-state variant.
- `message` is the triggering Message variant.
- `guardValue` is the value produced by an `Option` guard.
- `context` is present when the Machine declares a context Schema.

[Commands](/core/commands) returned by an Edge are ordinary Foldkit Commands. `transition`, `step`, and `Machine.fold` carry them back to the Runtime through update.

### Ordered Guards

Use an array when one state and Message pair has more than one possible outcome. The Machine checks entries from top to bottom and stops at the first `when` that passes, `otherwise`, or `ignore`.

A boolean guard answers only whether its Edge can fire. An `Option` guard can validate or look up a value once and pass that value to the handler:

::Snippet{name="machineOptionGuard" label="Option guard"}

Here `findDiscount` returns `Option<Discount>`. The handler runs only for `Some`, and `guardValue` is the unwrapped `Discount`. Use `otherwise(to(...))` for an unconditional transition fallback. Use `ignore()` when falling through is intentional and should be distinguishable from a missing table entry through `step`.

If a guard list has no fallback and every guard declines, no transition occurs. `step` reports that case as `GuardsFellThrough`.

### Shared Edges

Use `Machine.forStates(...).on(...)` for a transition that is genuinely the same across several source states. The [state machine example app](/example-apps/state-machine) declares cancellation once for Cart, Shipping, Payment, and Review.

Inside a shared handler, `state` narrows to the union of the selected variants. The handler can read fields those variants have in common without losing the Message narrowing from the `on` key.

Shared Edges are defaults. A state-local Edge for the same state and Message replaces the shared one, which lets one state specialize a broadly shared rule. Two shared groups cannot define the same state and Message pair; `Machine.define` throws instead of choosing by array order.

Keep shared groups about behavior, not visual tidiness. If the handlers differ, leave the Edges beside their source states.

### Read-Only Context

Add a context Schema when transition decisions need current parent-owned data that should not be copied into the Machine state.

::Snippet{name="machineContext" label="Machine context"}

Guards receive context as their third argument, and Edge handlers receive it in their input record. A contextual Machine requires that value on every `transition` and `step`. `Machine.fold` reads it from the enclosing Model for each Message.

Context is a read-only input to the current transition. State that the Machine owns still belongs in its state union.

## Use a Machine in Update

The Machine state lives in a field of the application Model. `Machine.fold` reads that field, runs the transition, writes the next state back, and preserves any Commands returned by the Edge.

::Snippet{name="machineFold" label="Machine fold"}

Most update functions also handle Messages that do not belong to the transition table. Match those Messages normally and send only the Messages handled by the table through the fold. In this example, `ToggledHelp` updates another Model field while the checkout Messages go through `foldCheckout`.

`read` returns an `Option` because the Machine may exist only in some parent Model variants. An always-present field returns `Option.some(model.checkout)`. When `read` returns `None`, the fold leaves the parent Model unchanged.

The fold is dual. Call `foldCheckout(model, message)` directly, or call `foldCheckout(message)` to produce a Step for `Update.combine`. A contextual Machine also supplies `context: model => ...` in the fold configuration.

Use `machine.transition(state, message)` when code already has the Machine state and wants a plain `Update.Return`. An unmatched Message returns the original state and no Commands. Use `machine.step(state, message)` when the caller needs to observe what happened. Its result is either:

- `Transitioned`, with the source, target, Message tag, next state, and Commands;
- `Ignored`, with the unchanged state and a reason.

The four ignored reasons answer different questions:

- `OutOfAlphabet`: the Message tag appears nowhere in the Machine.
- `NotApplicable`: the Machine knows the Message tag, but the current state has no Edge for it.
- `GuardsFellThrough`: the state has an Edge list for the Message, but every `when` declined and the list has no fallback.
- `ExplicitlyIgnored`: evaluation reached `ignore()`.

The Foldkit [Runtime](/core/runtime) needs no Machine configuration. Update calls a pure value and returns the resulting Model and Commands through the normal application loop.

## Analyze the Transition Graph

The transition table is enumerable data, so a Machine can answer structural questions without running the application:

- `edges` lists every Edge after shared defaults and state-local overrides are combined, with its source, Message tag, target, and guard position.
- `reachableFrom(tag)` returns the state tags reachable from one starting tag.
- `unreachableStates(extraRoots?)` returns states unreachable from `initial` and any extra roots.
- `deadTransitions(extraRoots?)` returns Edges whose sources are unreachable or that sit after an earlier `otherwise` or `ignore`.
- `toMermaid()` renders those Edges as a Mermaid flowchart definition.

A state-local Edge replaces its shared default before this graph is built, so transition selection and analysis see the same Edge.

Pass restored, deep-linked, hydrated, or otherwise external entry states as `extraRoots`. The analysis sees only declared Edges, so it cannot discover a state that application code enters outside the Machine.

The analysis is structural. It knows that an Edge after `otherwise` can never run, but it does not prove that a `when` predicate is always false. Business conditions inside guards still need behavioral tests.

The [Machine API reference](/api-reference/experimental-machine) lists the exact signatures for the transition, folding, and analysis APIs.

## Test Through the Machine

`transition` and `step` are pure. Tests can send a real state and Message through the Machine, then inspect the next state, Commands, or ignored reason. Add `unreachableStates` and `deadTransitions` assertions to the same test file. Then a table change that makes a state or Edge impossible to reach fails a test.

::Snippet{name="machineTesting" label="Machine tests"}

Test the Machine rather than exporting guards or handlers solely to test them in isolation. A guard that passes by itself does not prove that it sits under the intended state and Message or leads to the intended target.

## Keep the Transition Skeleton Together

Extract leaves when they have meaningful names: guards, target-state builders, and Command callbacks. Keep source state tags, `on` keys, guard order, and target tags in the table. Those are the skeleton a reader scans to understand the flow.

When an extracted Edge handler needs an explicit parameter type, use `Machine.EdgeInput<SourceState, TriggerMessage, GuardValue, Context>`. It preserves the source-state, Message, guard-value, and context types that the table position would otherwise infer.

When one state entry is substantial enough to deserve its own binding, preserve its contextual types with `StateTransitions`:

::Snippet{name="machineStateTransitions" label="Extracted state transitions"}

Avoid splitting every state into a separate module. That turns one readable graph back into control flow spread across files.

## Compose Larger Flows

Parallel state is ordinary Model composition: store two Machine states in two fields and fold each where its Messages belong.

A nested Machine is ordinary state composition too. Say an order flow has Browsing, CheckingOut, and Complete states. The CheckingOut variant can carry the checkout Machine's state:

::Snippet{name="machineNestedState" label="Machine state nested in another state"}

The order update sends checkout Messages to `checkoutMachine` only while the order is CheckingOut, then writes the returned checkout state back into that variant. Use this shape when the inner flow exists only during one phase of the outer flow.

When one table grows beyond a few screens, prefer composed Machines with explicit update delegation over a directory of per-state fragments. Each Machine keeps a coherent transition graph, and the enclosing Model shows how the regions relate.

Machine does not implement hierarchical statecharts. Nesting one Machine's state inside another state does not add inherited Edges or automatic Message forwarding. Use `forStates` for one Edge shared by a known set of source states. The complete [state machine example app](/example-apps/state-machine) shows a checkout with guards, extracted guard values, transition-time Commands, shared Edges, ignored outcomes, graph analysis, and an on-page inspector.
