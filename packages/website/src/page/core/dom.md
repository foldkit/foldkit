# Dom

## Overview

An application may need to act on the document once after update or observe browser input while part of the UI is active. The `Dom` module provides Effects for one-time operations and Streams for ongoing input.

Use a Dom Effect when a Message should cause a one-time DOM operation. For example: opening a dialog can return a Command that focuses its first input. The operation stays outside view, and its result still comes back through update as a Message.

Use a Dom Stream when browser events, media-query changes, or key bindings should produce Messages over time. A [Subscription](/core/subscriptions) runs ongoing work according to Model-derived dependencies. A [Mount](/core/mount) runs it while a rendered element exists.

## Using Dom Effects

Each Effect helper exposes its failure type in the Effect channel. `Dom.focus` returns `Effect.Effect<void, ElementNotFound>`, while helpers without an expected application failure, such as `Dom.lockScroll`, return `Effect.Effect<void>`.

Wrap the helper in a Command and map its success or failure into one of that Command's declared Messages.

::Snippet{name="domFocus" label="Focusing an input from a Command"}

Most helpers that resolve a live element wait until Foldkit has committed the latest render before querying the DOM. This lets update return a Command for an element that the same Message just brought into the view. You do not need to add `Render.afterCommit` before `Dom.focus`, `Dom.showDialog`, `Dom.clickElement`, `Dom.scrollIntoView`, or `Dom.advanceFocus`.

`Dom.showDialog` resolves to `true` when it installs the focus trap, return focus, stack entry, and optional modal isolation. It resolves to `false` when that Dialog id already holds those resources, so concurrent lifecycle recovery and application Commands do not acquire them twice.

Scrolling has two later-timing variants. `Dom.scrollIntoViewAfterPaint` waits until the target has been painted, which suits a route that just inserted a fragment target. `Dom.scrollIntoViewIfNotVisible` also waits through paint by default, but accepts `{ when: 'Commit' }` when the first visible frame should already be scrolled.

Cleanup and global-state helpers run immediately because they do not need a newly rendered target. These include `Dom.closeDialog`, `Dom.releaseDialogResources`, `Dom.lockScroll`, `Dom.unlockScroll`, and `Dom.restoreInert`. `Dom.waitForAnimationSettled` has its own timing contract: it checks the target's active Web Animations on the next animation frame and waits for them to settle.

:::Info{label="Use Render for custom timing"}
Dom helpers include the timing their operation needs. Reach for [Render](/core/render) directly when writing a custom Command or DOM-observing Subscription that must wait for a Foldkit commit or a browser paint.
:::

### Selector Failures

Helpers that require one matching element fail with `ElementNotFound` when the selector resolves to the wrong element type or no element at all:

- `Dom.focus`
- `Dom.showDialog`
- `Dom.closeDialog`
- `Dom.clickElement`
- `Dom.scrollIntoView`
- `Dom.scrollIntoViewAfterPaint`
- `Dom.scrollIntoViewIfNotVisible`
- `Dom.advanceFocus`

Catch a meaningful failure with `Effect.catch` and turn it into a Message. Use `Effect.ignore` only when a missing target is expected and does not matter, such as a stale focus Command after navigation.

## Using Dom Streams

Each Dom Stream helper returns a composable Stream, not a complete Subscription entry. Compose the Stream with Effect Stream operators, then give it to a Subscription or Mount. For a listener attached to one rendered element, `Mount.defineStream` starts it when the element appears and stops it when the element leaves the view:

::Snippet{name="domMountEvent" label="Element pointer Stream owned by a Mount"}

The [Subscriptions guide](/core/subscriptions) covers Model-driven lifetimes and `Subscription.persistentEntry`.

### Event Streams

`Dom.streamFromEvent` turns an `EventTarget` into a Stream. The target may be `window`, `document`, or a rendered element. The helper adds the listener when the Stream starts and removes it when the Stream stops.

Its `mapEvent` callback can produce any output type, including the raw event. A Subscription or Mount that runs the Stream checks that its output is a declared Message type.

::Snippet{name="subscriptionFromEvent" label="Window keydown Stream in a Subscription"}

The `mapEvent` mapper runs synchronously in the same call stack as the browser event, so it may call `event.preventDefault()` unless the listener is passive. Some browsers default wheel and touch listeners on global targets to passive, where cancellation is ignored. Pass `options: { passive: false }` when cancelling those events. Pass `target` as a thunk if it may not exist until the scope opens; pass always-present globals such as `window` and `document` directly.

#### Typed Event Targets

The `type` field accepts only event names declared by the target, and `mapEvent` receives the corresponding event type. For example, `window` with `'keydown'` gives the mapper a `KeyboardEvent`. A bare `EventTarget` accepts any name and reports `Event`. Annotate a target with `Dom.TypedEventTarget` to declare its custom events, including `CustomEvent` detail:

::Snippet{name="subscriptionTypedEventTarget" label="Typed custom EventTarget"}

Annotating a native target adds its declared events without losing the native ones. If a declared event uses the same name as a native event, the declared type takes precedence.

#### Filtered Events and Synchronous Cancellation

When only some events should produce a value, use `Dom.streamFromEventFilterMap`. Its `filterMapEvent` returns `Option.some(value)` to emit it or `Option.none()` to ignore the event. A mapper that never emits produces a `Stream<never>`, which still composes wherever a Message-producing Stream is expected.

::Snippet{name="domFilteredEvent" label="Filtered Escape key presses"}

Cancellation must happen inside the listener callback. A downstream `Stream` operator runs after the browser has committed the default action. When a handled event should also cancel its default action, use `Dom.streamFromEventFilterMapPreventDefault`. Its `filterMapEvent` returns `Option.some(value)` to handle the event or `Option.none()` to leave its default behavior intact. The helper evaluates the mapper, calls `preventDefault()`, and queues the value before the native listener returns. Both filtered helpers infer their Stream output from `filterMapEvent`. The cancelling helper registers the listener with `passive: false` by default and does not accept `passive: true`, which would make cancellation ineffective.

::Snippet{name="domPreventDefault" label="Cancel handled search shortcuts"}

### Media Queries

`Dom.streamFromMediaQuery` creates a Stream from a CSS media query. When the Stream starts, it emits the query's current `matches` value through `mapMatches`. It emits again whenever the value changes. Handle those values as Messages in update to store the result in the Model. Most apps therefore do not need a separate `window.matchMedia` read at boot. An app that must use the value before its Subscriptions start, such as one that applies a theme before hydration, should still read it at boot.

Reading the current value also prevents stale state when a gated entry restarts. Suppose a color-scheme Subscription runs only while the theme preference is `System`. The user selects `Dark`, changes the operating system to a light theme, and then selects `System` again. A new `change` listener waits for the next change, so the Model still records a dark system theme. `Dom.streamFromMediaQuery` reads the current light value as soon as the Stream restarts.

::Snippet{name="subscriptionFromMediaQuery" label="Reduced motion media query"}

Creating the Stream does not access `window`; `window.matchMedia` is called only when the Stream starts. The same helper works for `prefers-reduced-motion`, `prefers-color-scheme`, and viewport breakpoints such as `(max-width: 1023px)`.

### Key Bindings

`Dom.streamFromKeyBindings` builds a `keydown` Stream from a declarative key-binding table. It listens on `document` by default; pass `target` to listen on a different `EventTarget`, including an element owned by a Mount. Use `keys` with a string for one press, such as `'Escape'` or `'Mod+K'`, and an array for an ordered sequence, such as `['G', 'H']`. Every step in a sequence uses the same grammar, including modifiers.

Modifier matching is exact: `'Mod+K'` does not also match Shift-Mod-K. `Mod` resolves to Meta on Apple platforms and Control elsewhere; `modKey` provides a deterministic override when needed. Matching uses the layout-aware `KeyboardEvent.key`, so include `Shift` and the resulting character for shifted punctuation. `Space` and `Plus` name keys that would otherwise be awkward in the `+`-separated syntax.

By default, a binding calls `preventDefault()` and does not fire from an `input`, `textarea`, `select`, or contenteditable composed path. `whileTyping: 'Allow'` opts in bindings such as Escape that must work inside an editor. Events during IME composition and held-key repeats are ignored; a one-press binding can opt into repeats with `whenRepeated: 'Allow'`. An event that an element-level handler already canceled is also ignored, so local interactions take precedence over global bindings.

#### Sequences

Sequences may have any length and expire after one second unless `sequenceTimeout` overrides the duration. The helper rejects duplicate bindings, a one-press binding that is also a sequence prefix, and shared sequence prefixes with inconsistent `preventDefault` policies. A mismatched key clears the current sequence and is reconsidered as a fresh press.

#### Model-Dependent Key Bindings

The Stream's output type comes from each binding's `mapEvent`. Put a fixed table in `Subscription.persistentEntry`, or build the table inside an entry when availability follows the Model. Derive `isEnabled` from that entry's dependencies, as the example does for Escape. If the meaning of a key depends on the Model, dispatch a factual Message such as `PressedEscape` and make the decision in update; `mapEvent` should not read application state.

::Snippet{name="subscriptionKeyBindings" label="Model-dependent key bindings"}

## Full API Surface

The [Dom API reference](/api-reference/dom) lists every helper with its signature and an inline example.
