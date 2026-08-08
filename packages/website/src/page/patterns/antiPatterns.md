# Anti-patterns

## Overview

Foldkit anti-patterns are not merely code that could be shorter or more consistent. They are shapes that weaken an architectural boundary, hide a state transition, or make runtime behavior depend on something outside the Model and Message loop.

Most of them compile. Many pass tests. The warning sign is that a reader can no longer explain every Model change and side effect by following Messages through `update`.

Use this page as a design review. Each section names the tempting approach, explains what it breaks, and points to the idiomatic Foldkit shape.

## Driving a Submodel Through Its Internals

A parent stores a Submodel’s Model, but it does not own that Model. Parent update handlers must not reach into the child’s fields with `evo`.

::Snippet{name="submodelDirectEvoAntipattern" label="antipattern" class="mb-4"}

Going through the child’s `update` is necessary, but it is not sufficient by itself. A parent-owned handler also should not import a child Message constructor, construct `ChangedTheme`, and thread it through `Settings.update`. That still couples the parent to the child’s private event vocabulary.

For parent-initiated behavior, the Submodel exposes a named function. The exported function owns construction of any internal Message and runs the transition through the child’s `update`. The parent only knows the public verb.

::Snippet{name="submodelDelegateViaHelper" label="idiomatic" class="mb-4"}

The distinction is about direction:

- A Message that originated inside the child arrives in `GotSettingsMessage`. The parent already has that child Message, so it delegates directly to `Settings.update`.
- A parent-owned Message needs to drive the child. The parent calls an exported function such as `Settings.setTheme`, `Dialog.open`, `Slider.reflectRange`, or `Room.informPressedKey`.
- A child needs to tell the parent a domain fact. The child returns an OutMessage, which the parent matches by tag.

The exported function must preserve the child’s single transition path. It should call `update` or reuse the same internal transition logic, not mutate the child Model through a second path.

See [Never Bypass the Child’s Update](/core/submodel#never-bypass-the-update) for the full boundary and [Informing Submodels](/patterns/informing-submodels) for changes the child needs to hear about but does not own.

## Flattening a Submodel Boundary

Putting `Child.Message` directly into the parent’s Message union makes every child tag part of the parent’s vocabulary. Matching child tags in the parent has the same problem. The child cannot rename or add internal events without changing its consumer.

Wrap child Messages in one `Got*Message` variant instead. The wrapper carries routing information only: the child Message and, for repeated children, the child’s stable identifier. One parent handler delegates to the child’s `update`, stores the returned child Model, and maps the child’s Commands back through the same wrapper.

Do not add domain payload to the wrapper so the parent can partly handle the event before delegation. Put the payload in the child Message. When a fact genuinely belongs to the parent, surface it as an OutMessage and match its tag after the child update returns.

This keeps the communication directions separate:

- `Got*Message` routes child events and Command results back into the child.
- Exported functions let the parent initiate child behavior.
- OutMessages surface facts from the child to the parent.

See [Wrapping Messages](/core/submodel#wrapping-messages), [Delegating in update](/core/submodel#delegating-in-update), and [Surfacing Facts](/core/submodel#surfacing-facts).

## Using Messages as Instructions or Placeholders

Messages are facts about what happened. Names such as `SetUsername`, `FetchWeather`, and `ShowDialog` tell `update` what to do, which moves the decision into the event name. Prefer facts such as `UpdatedUsername`, `ClickedRefresh`, and `ClickedOpenDialog`. The handler decides how the Model and Commands respond.

Commands are the imperative half of the vocabulary. `FetchWeather`, `FocusSearchInput`, and `SaveDraft` are good Command names because a Command is an instruction to the runtime.

A generic `NoOp` Message is the same leak in another form: it records that the runtime returned something, but not what happened. Use a descriptive fact even when its handler returns `[model, []]`, such as `CompletedFocusSearchInput`, `IgnoredMouseClick`, or `SuppressedSpaceScroll`.

See [Messages](/best-practices/messages) for the naming convention and Command-to-Message pairs.

## Encoding One State as Several Independent Fields

Several booleans or optional fields describing one mode allow combinations the application never intended. `isLoading`, `isError`, `maybeData`, and `maybeError` can claim that loading and failure are both active, or that success has no data.

Use one discriminated union for one state machine. Use `Option` when absence is part of the domain, not `null`, an empty string, `0`, `-1`, or `NaN`. Avoid storing values that can be derived from other Model fields unless the duplication has a specific, documented purpose.

For remote data, use [AsyncData](/core/async-data) instead of hand-rolling `Idle | Loading | Error | Ok`. Its `Refreshing` and `Stale` states preserve existing data during refetches and failures, which is where four-state versions usually lose information.

Booleans remain appropriate for independent facts. The anti-pattern is using several independent fields to encode a single mutually exclusive mode.

See [Model](/core/model) and [Immutability](/best-practices/immutability) for the underlying state-modeling rules.

## Running Side Effects at Decision Time

Calling `fetch`, `Date.now`, `Math.random`, a DOM API, storage, or `Effect.run*` from `update` makes the same Model and Message produce different behavior. Doing that work from `view` is worse because rendering frequency becomes the trigger. Module-level side effects also run outside the application lifecycle and produce stale values across HMR.

Keep `update` and `view` pure:

- A Message just requested one-time work: return a Command.
- Initial Model data comes from the outside world: read it in flags and pass it to `init`.
- A Command can fail: catch the error inside its Effect and return a `Failed*` Message.
- A value changes because of an external stream: model it with a Subscription.

Constructing an Effect value is still pure. The side effect happens only when the Foldkit runtime executes that description through the appropriate seam.

See [Side Effects & Purity](/best-practices/side-effects-and-purity), [Commands](/core/commands), and [Init & Flags](/core/init-and-flags).

## Choosing a Lifecycle Primitive by Convenience

Command, Mount, Subscription, ManagedResource, and CustomElement can all contain Effects, but they describe different causes. Picking whichever API is closest usually gives the side effect the wrong lifetime.

| Cause                                                              | Primitive       |
| ------------------------------------------------------------------ | --------------- |
| A Message just dispatched                                          | Command         |
| A rendered element exists, and the work needs that live element    | Mount           |
| An external event source is active while a Model condition holds   | Subscription    |
| A Model condition controls a stateful handle that Commands consume | ManagedResource |
| A native web component accepts properties and emits `CustomEvent`s | CustomElement   |

A Mount whose factory ignores its element is the clearest smell. The cause is a Message or Model condition, not the element’s existence. Likewise, a continuous document event stream does not become a Mount merely because its result affects the view.

Choose from the cause, then let the runtime own acquisition, cleanup, interruption, and Message delivery. The [Mount](/core/mount#when-to-reach-for-mount) guide compares all five primitives in detail.

## Starting Dependent Commands Together

Commands returned in one array are independent work. The runtime does not interpret their order as sequencing.

Returning `SaveDraft()` and `NavigateToDashboard()` together lets navigation win while the save is still in flight. A failure then arrives on a route that may not render it, and the user sees a successful transition for an unsuccessful operation.

When one operation depends on another, let the first Command return a Message and start the second operation from that handler. `SubmittedDraft` returns only `SaveDraft`. `SucceededSaveDraft` stores the result and returns `NavigateToDashboard`. `FailedSaveDraft` keeps the user on the form and exposes the error.

Parallel Commands are idiomatic when they are genuinely independent. A required ordering is a Message sequence, not an array position.

## Using Keys as Render Controls

Keys carry identity. They are not a refresh switch, a change detector, or a general branch marker.

Three mistakes account for most keying bugs:

- Mapped rows are unkeyed or keyed by array position, so reordering transfers DOM state and handlers to a different entity.
- A key is derived from displayed data, so every edit tears the same entity down and discards focus, selection, scroll, and open state.
- Conditional branches are manually keyed even though view-function identity already distinguishes them.

Key mapped rows by a stable Model identifier. Also key a shared detail view by the entity identifier when the same view function renders different entities at one position. Those are the two cases where application data must provide identity.

Build with `@foldkit/vite-plugin` so view functions provide branch identity. When an inline same-tag branch must reset DOM state, extract its arms into named view functions instead of inventing keys.

See [Keying](/best-practices/keying) for the complete identity model.
