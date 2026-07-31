# Anti-patterns

## How to Use This Guide {#overview}

An anti-pattern is a design that works but makes a Foldkit application harder to explain, test, or change. The examples on this page come from real Foldkit applications and from The Elm Architecture more generally. Each pattern makes at least one of these questions difficult to answer:

- What does the Model say is true?
- Which Message caused the Model to change?
- Which part of the application owns the state, effect, or lifetime?

Judge the behavior, not an isolated piece of syntax. A Boolean can model an independent fact, an async result needs extra identity only when it can become stale, and a public Submodel helper is correct when it preserves the child's update boundary.

## Make Impossible States Unrepresentable

Several fields can accidentally describe alternatives that should never occur together. For example, a Model with `isLoading`, `maybeData`, and `maybeError` can say that loading and failure are both active.

If changing one field requires checking or resetting the others, replace the fields with one discriminated union. This makes impossible states unrepresentable. See [State with Variants](/core/model#state-with-variants) for the Foldkit pattern.

::Snippet{name="modelTaggedUnion" label="discriminated Model state"}

For remote data, use [AsyncData](/core/async-data) instead of recreating its loading, refreshing, stale, failure, and success variants. Use [Machine](/core/machine) when the application must also restrict which variants may follow one another.

Booleans and `Option` remain appropriate when the facts vary independently. The problem is using separate fields for alternatives that cannot coexist.

## Store Each Piece of State Once

Storing the same information in more than one place creates a synchronization problem. Common forms include:

- storing filtered or sorted results beside the source collection;
- treating a module variable or browser storage as a second live copy of a Model field;
- treating a DOM class, attribute, or uncontrolled widget value as application state;
- copying shared parent state into a child Model only so the child can read it.

Store each piece of state once, in the Model field or Submodel responsible for changing it, and derive other values from that source. Pass parent-owned data needed only for rendering through Submodel `viewInputs`, and pass current parent context as an explicit input to a child update. When a change to parent-owned state must cause a child transition, [inform the child through its public boundary](/patterns/informing-submodels).

Caching a derived value in the Model can be a deliberate performance optimization. For example, if the Model stores both `items` and `sortedItems`, every handler that changes `items` must also update `sortedItems`. Profile first, use [view memoization](/core/view-memoization) when building or diffing the view is expensive, and cache derived data in the Model only when profiling shows that the computation itself is the bottleneck. The [performance guide](/faq/performance#the-optimization-toolkit) explains that tradeoff.

A cached field remains derived only when recomputing it from the source always produces the same value. If users can edit the cached value independently, or if stale cached data changes what update does, the application has two conflicting sources of truth.

## Define the Model with Schema

A handwritten TypeScript type beside a weaker runtime Schema creates two definitions of the same state. TypeScript and the decoder can then disagree about the Model's shape.

Define the Model with Schema and derive its TypeScript type from that value. Avoid placeholders such as `Schema.Unknown` for fields whose shape is already known, and define each valid variant in the Schema instead of adding a stricter, unrelated TypeScript interface later.

This matters even when no data crosses a network boundary. Foldkit uses the Model Schema to restore state across development reloads, so a weaker Schema can accept a value that the handwritten type claims is impossible. The same Schema can validate unknown data at application boundaries. It is part of the application architecture, not an unrelated serialization layer.

See [Model](/core/model) for the complete pattern.

## Keep Effects Out of init, update, and view

Calling `fetch` inside view starts another request whenever Foldkit renders that view. Calling `Date.now`, `Math.random`, storage APIs, DOM APIs, or `Effect.run*` inside init or update similarly makes the next Model depend on work the Runtime cannot observe or control. A storage or DOM write inside update also runs again during DevTools replay.

::Snippet{name="updatePureBad" label="effect during update" class="mb-4"}

::Snippet{name="updatePureGood" label="Command returned from update"}

Choose the boundary from the cause:

- A Message requires one-time work: return a [Command](/core/commands).
- The initial Model needs outside data: decode it through [Flags](/core/init-and-flags#flags).
- Model-derived dependencies control the lifetime of a scoped Stream: use a [Subscription](/core/subscriptions).
- The work requires a particular live element: use [Mount](/core/mount).

Returning an Effect, Stream, or Layer description is pure when creating that description does not eagerly perform the work. The Foldkit Runtime starts it at the chosen boundary.

## Name Messages After Facts

A Message records a fact. Names such as `SetUsername`, `FetchWeather`, and `ShowDialog` tell update what to do and hide the event that caused the decision. Use `UpdatedUsername`, `ClickedRefresh`, and `ClickedOpenDialog`; update can then decide what each fact means in the current Model.

Commands are the imperative half of the vocabulary. `FetchWeather`, `FocusSearchInput`, and `SaveDraft` are good Command names because they instruct the Runtime to perform work. Their result Messages report what happened: `SucceededFetchWeather`, `FailedFetchWeather`, and `CompletedFocusSearchInput`.

The name `NoOp` fails for a different reason: it hides the fact that caused the Message. A Message whose handler leaves the Model unchanged is fine. Name the fact, such as `IgnoredMouseClick` or `SuppressedSpaceScroll`, so history and tests retain the cause.

See [Messages](/best-practices/messages) for naming and Command-to-Message pairs.

## Reject Stale Async Results

An async result can arrive after the Model has moved on. For example, a search for `ca` may finish after a newer search for `cat`. If the result Message carries only the response, the older result can overwrite the newer search state.

Include enough context in the result Message to decide whether it still applies. Depending on the domain, that may be the entity id, query, route key, generation, or revision that started the work. The result handler compares that context with the current Model and explicitly accepts or ignores the result.

Do not add a request id mechanically. Extra context is unnecessary only when every possible completion remains valid for whatever Model can receive it. Ask whether an older completion could be mistaken for the current answer.

## Sequence Dependent Commands Through Messages

Commands returned together start independently. Their array positions do not mean “first save, then navigate” or “cancel the old request, then start the new one.” If navigation depends on a successful save, return the save Command first and return the navigation Command from its success Message handler.

Declaring `interrupt` makes targeted in-flight work stoppable and adds an `Interrupt` constructor to the Command Definition. It does not make a new invocation with the same key replace an older one. To replace work, return the Interrupt, wait for its result Message, and return the replacement Command from that handler.

An Interrupt is not guaranteed to stop a Command. It reports `NotFound` when the keyed work already completed or never started. Either result means the key is free, so the result handler can start the replacement. When the target already completed, its result Message may be queued and can still reach update. The stale-result check from the previous section therefore remains necessary.

Parallel Commands are appropriate when they are genuinely independent. Starting dependent work from a result Message makes the order explicit in update, DevTools, and tests. See [Replacing Cancelled Work](/core/commands#replacing-cancelled-work) for the full interruption protocol.

## Preserve Submodel Boundaries

A parent stores a Submodel's Model, but the child owns its transitions. A parent can violate that boundary in three different ways:

- Changing child fields with `evo` bypasses the child update and skips its invariants, Commands, and OutMessages.
- Importing and constructing an internal child Message makes the parent depend on the child's implementation instead of its public API.
- Manually unpacking a child update result can drop its Commands or OutMessage.

::Snippet{name="submodelDirectEvoAntipattern" label="boundary bypass" class="mb-4"}

The second mistake can look safer because the parent still calls the child update, but it exposes an internal event as a parent-facing API:

::Snippet{name="submodelInternalMessageAntipattern" label="parent constructs a child Message" class="mb-4"}

Preserve the direction of communication:

- A Message originating in the child is wrapped in one `Got*Message` variant and delegated with `Update.foldChild`.
- A parent-owned fact drives the child through a named helper the child exports, folded with `Update.foldChild` or `Update.foldChildStep`.
- A fact the child needs to surface becomes a tagged OutMessage that the parent matches through `foldOutMessage`.

::Snippet{name="submodelDelegateViaHelper" label="public child transition"}

A public helper is idiomatic when it preserves the child's single transition path. It runs the child's internal Message through update without exposing that Message constructor.

See [Submodel](/core/submodel) for the complete boundary and [Informing Submodels](/patterns/informing-submodels) for changes the child needs to hear about but does not own.

## Keep Live Handles Behind Runtime Boundaries

A selected `File` is application data and may belong in the Model. A camera stream, `WebSocket`, worker, observer, editor instance, or DOM element is different: it is a live handle with acquisition and cleanup. Keep whether the handle is needed, whether it is ready, and other user-visible facts in the Model. Let a Runtime boundary own the handle itself.

Choose a Runtime boundary by what causes the work and how long it must live:

| Cause or lifetime                                                           | Boundary        |
| --------------------------------------------------------------------------- | --------------- |
| A Message requires one-shot work                                            | Command         |
| A rendered element exists, and the work uses that element                   | Mount           |
| Model-derived dependencies control the lifetime of a scoped Stream          | Subscription    |
| A Model condition controls a typed handle used by Commands or Subscriptions | ManagedResource |
| A service lives for the entire application Runtime                          | Resources       |
| A native web component is rendered declaratively                            | CustomElement   |

A Mount whose `execute` function ignores its element is the clearest warning sign: the element does not actually cause the work. A module variable holding a connection is another; its lifetime is no longer tied to the Model or Runtime.

Keep the desired lifetime and user-visible status in the Model. Let the chosen boundary perform the work and any required cleanup. The [Mount comparison](/core/mount#when-to-reach-for-mount) and [Managed Resources](/core/managed-resources) guides cover the boundaries in depth.

## What Linting Can Catch

The [Foldkit linter](/tooling/oxlint-plugin) catches many local signatures of these problems, including module-level mutable state, eager clock and randomness calls at decision time, parent construction of child Messages, and Submodel boundary mistakes. Linting cannot decide who owns a piece of domain state or whether an async result is stale. Use the questions above for that design review.
