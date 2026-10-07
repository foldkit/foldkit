# Browser

## Overview

Browser events can arrive from a window, document, or rendered element. Foldkit's `Browser` helpers turn those sources, media queries, and key bindings into composable Effect Streams. A Stream describes the values to emit; its owner decides when observation starts and stops.

A [Subscription](/core/subscriptions) owns a Stream according to Model-derived dependencies or a parent gate. A [Mount](/core/mount) owns a Stream while its rendered element exists. For example, a window shortcut can follow a page's Model through a Subscription, while a pointer listener on one element belongs in `Mount.defineStream`. Both feed Messages to update.

::Snippet{name="browserMountEvent" label="Element pointer Stream owned by a Mount"}

Compose these Streams with Effect Stream operators before giving the result to its lifetime owner. The [Browser API reference](/api-reference/browser) lists their full configuration types.

## Event Streams

`Browser.streamFromEvent` turns an `EventTarget` into a Stream. Window shortcuts and document visibility are common Subscription sources. The helper adds the listener when the Stream starts and removes it when the Stream stops. For a media query, use `Browser.streamFromMediaQuery` from the [Media Queries](#media-queries) section. That helper also emits the query's current value.

The helper returns a Stream, not a complete Subscription entry. Its `mapEvent` callback can produce any output type, including a raw event. A Subscription or Mount that runs the Stream checks that its output is a declared Message type. Use `Stream.when` inside a Subscription entry to gate a listener on the Model, or use `Subscription.fromStream` when the entry has no local Model dependencies.

::Snippet{name="subscriptionFromEvent" label="Window keydown Stream in a Subscription"}

The `mapEvent` mapper runs synchronously in the same call stack as the browser event, so it may call `event.preventDefault()` unless the listener is passive. Some browsers default wheel and touch listeners on global targets to passive, where cancellation is ignored. Pass `options: { passive: false }` when cancelling those events. Pass `target` as a thunk if it may not exist until the scope opens; pass always-present globals such as `window` and `document` directly.

### Typed Event Targets

The target, the event name, and the event your mapper receives are one fact rather than three. `type` is constrained to the events the target declares, so a misspelled name is a compile error rather than a listener that never fires, and `event` follows from both: `window` plus `'keydown'` gives you a `KeyboardEvent` with no type argument to write. A target with no declared event map, such as a bare `EventTarget`, accepts any name and reports `Event`. Annotate one with `Browser.TypedEventTarget` to have its own events resolved the same way, `CustomEvent` detail included:

::Snippet{name="subscriptionTypedEventTarget" label="Typed custom EventTarget"}

Annotating a native target adds its declared events without losing the native ones. If a declared event uses the same name as a native event, the declared type takes precedence.

### Filtered Events and Synchronous Cancellation

When only some events should produce a value, use `Browser.streamFromEventFilterMap`. Its `filterMapEvent` returns `Option.some(value)` to emit it or `Option.none()` to ignore the event. A mapper that never emits produces a `Stream<never>`, which still composes wherever a Message-producing Stream is expected.

::Snippet{name="browserFilteredEvent" label="Filtered Escape key presses"}

Cancellation must happen inside the listener callback. A downstream `Stream` operator runs after the browser has committed the default action. When a handled event should also cancel its default action, use `Browser.streamFromEventFilterMapPreventDefault`. Its `filterMapEvent` returns `Option.some(value)` to handle the event or `Option.none()` to leave its default behavior intact. The helper evaluates the mapper, calls `preventDefault()`, and queues the value before the native listener returns. Both filtered helpers infer their Stream output from `filterMapEvent`. The cancelling helper registers the listener with `passive: false` by default and does not accept `passive: true`, which would make cancellation ineffective.

::Snippet{name="browserPreventDefault" label="Cancel handled search shortcuts"}

## Media Queries

`Browser.streamFromMediaQuery` creates a Stream from a CSS media query. When the Stream starts, it emits the query's current `matches` value through `mapMatches`. It emits again whenever the value changes. Handle those values as Messages in update to store the result in the Model. Most apps therefore do not need a separate `window.matchMedia` read at boot. An app that must use the value before its Subscriptions start, such as one that applies a theme before hydration, should still read it at boot.

Reading the current value also prevents stale state when a gated entry restarts. Suppose a color-scheme Subscription runs only while the theme preference is `System`. The user selects `Dark`, changes the operating system to a light theme, and then selects `System` again. A new `change` listener waits for the next change, so the Model still records a dark system theme. `Browser.streamFromMediaQuery` reads the current light value as soon as the Stream restarts.

::Snippet{name="subscriptionFromMediaQuery" label="Reduced motion media query"}

The helper returns a Stream. Pass it to `Subscription.fromStream` for a query the app always follows. To follow the query only in a particular Model state, use it with `Stream.when` inside an entry. Creating the Stream does not access `window`; `window.matchMedia` is called only when the Stream starts. The same helper works for `prefers-reduced-motion`, `prefers-color-scheme`, and viewport breakpoints such as `(max-width: 1023px)`.

## Key Bindings

`Browser.streamFromKeyBindings` builds a `keydown` Stream from a declarative key-binding table. It listens on `document` by default; pass `target` to listen on a different `EventTarget`, including an element owned by a Mount. Use `keys` with a string for one press, such as `'Escape'` or `'Mod+K'`, and an array for an ordered sequence, such as `['G', 'H']`. Every step in a sequence uses the same grammar, including modifiers.

::Snippet{name="subscriptionKeyBindings" label="Model-dependent key bindings"}

Modifier matching is exact: `'Mod+K'` does not also match Shift-Mod-K. `Mod` resolves to Meta on Apple platforms and Control elsewhere; `modKey` provides a deterministic override when needed. Matching uses the layout-aware `KeyboardEvent.key`, so include `Shift` and the resulting character for shifted punctuation. `Space` and `Plus` name keys that would otherwise be awkward in the `+`-separated syntax.

By default, a binding calls `preventDefault()` and does not fire from an `input`, `textarea`, `select`, or contenteditable composed path. `whileTyping: 'Allow'` opts in bindings such as Escape that must work inside an editor. Events during IME composition and held-key repeats are ignored; a one-press binding can opt into repeats with `whenRepeated: 'Allow'`. An event that an element-level handler already canceled is also ignored, so local interactions take precedence over global bindings.

### Sequences

Sequences may have any length and expire after one second unless `sequenceTimeout` overrides the duration. The helper rejects duplicate bindings, a one-press binding that is also a sequence prefix, and shared sequence prefixes with inconsistent `preventDefault` policies. A mismatched key clears the current sequence and is reconsidered as a fresh press.

### Model-Dependent Key Bindings

The helper returns a Stream and infers its output from each binding's `mapEvent`. A Subscription or Mount checks the resulting Message type. Put a fixed table in `Subscription.fromStream`, or build the table inside an entry when availability follows the Model. Derive `isEnabled` from that entry's dependencies, as the example does for Escape. The [Subscriptions guide](/core/subscriptions) covers entry lifetimes and lifting. If the meaning of a key depends on the Model, dispatch a factual Message such as `PressedEscape` and make the decision in update; `mapEvent` should not read application state.
