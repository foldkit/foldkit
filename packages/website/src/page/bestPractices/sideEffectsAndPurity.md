# Side Effects and Purity

## Purity in Foldkit {#overview}

Foldkit keeps view and update pure. They describe the next UI and any work to perform, but they do not perform that work themselves.

`view` returns a `Document` or `Html` value. Its event handlers construct Messages. `update` returns the next Model, Commands, and, for a Submodel, an optional OutMessage. Given the same inputs, both functions make the same decisions without reading or changing the outside world.

Effectful work lives at boundaries managed by the Runtime. Depending on the boundary, that work is described by an Effect, Stream, or Layer:

- [Commands](/core/commands) describe one-shot work caused by a Message, such as an HTTP request, navigation, storage operation, or focus change.
- [Mount](/core/mount) describes work tied to one live `Element`. Use it for element measurement, observers, portaling, and imperative third-party libraries.
- [Flags](/core/init-and-flags#flags) obtain the outside data needed before init can construct the first Model.
- [Subscriptions](/core/subscriptions) describe ongoing work whose lifetime follows dependencies derived from the Model.
- [Resources](/core/resources) provide app-lifetime services shared by Commands, Subscriptions, Mounts, and Flags.
- [ManagedResource](/core/managed-resources) acquires a typed stateful handle while a Model condition holds. Commands and Subscriptions can use that handle while it is live.

These descriptions do nothing until the Runtime starts them. One narrow exception stays inside its boundary: a mapper passed to `Subscription.fromEvent` may perform synchronous browser work such as `event.preventDefault()` before returning a Message.

A [CustomElement](/core/custom-element) binding remains declarative. Properties flow from the Model into the native element, and its events return as Messages. The browser owns the custom element's internal implementation.

## Why Purity Matters {#why-purity}

- **Replay stays safe.** DevTools can replay Messages through update without firing network requests, analytics, storage writes, or DOM work again.
- **State remains explainable.** Each Model follows from the previous Model and one Message. The history does not depend on a hidden callback changing data elsewhere.
- **Tests stay deterministic.** Story tests resolve Command results explicitly, while Scene tests acknowledge effect boundaries surfaced by the rendered view.

## Common Mistakes

For example:

- Production logging inside update runs again during DevTools replay. Put logging and error reporting in a Command. Temporary `console.log` calls are still useful while debugging, but remove them when the investigation ends.
- `Date.now()` and `Math.random()` inside update make the result depend on when it runs. Ask for time or randomness through a Command and return the value in its result Message.
- `fetch` inside view starts work whenever the view renders. Start the request with a Command returned by update.
- Reading `document` or `window` inside view or update hides browser state outside the Model. Use a Command for one-shot reads, a Subscription for ongoing external state, or Mount when the work requires a particular live element.

## View and update {#pure-functions}

### View is Pure

View reads the Model and any declared ViewInputs, then returns `Document` or `Html`. It does not fetch, schedule timers, subscribe, or read live DOM state. Event attributes construct Messages for the Runtime to dispatch.

::Snippet{name="viewPureBad" label="bad view example" class="mb-4"}

::Snippet{name="viewPureGood" label="good view example"}

### Update is Pure

Update reads the current Model and one Message. It returns a new Model plus descriptions of any work that should follow. It does not mutate the Model, touch the DOM, or execute a Command.

::Snippet{name="updatePureBad" label="bad update example" class="mb-4"}

::Snippet{name="updatePureGood" label="good update example"}

The [Testing](/testing) guide shows how Story drives update and resolves Commands without a DOM, while Scene exercises the effect boundaries exposed by a rendered view.

## Requesting Outside Values {#requesting-values}

Randomness, clocks, storage, and browser APIs produce values that are not already in the Model or Message. Request those values through a Command.

This version generates a different position each time update receives the same inputs:

::Snippet{name="pureUpdateBad" label="bad example"}

The pure version returns `GenerateApplePosition`. Its Effect generates the coordinates and sends them back in `CompletedGenerateApplePosition`:

::Snippet{name="pureUpdateGood" label="good example"}

`RequestedApple` now returns the same Model and Command every time. Only the result handler writes the generated position into the Model.

See the [Snake example](https://github.com/foldkit/foldkit/blob/main/examples/snake/src/main.ts#L220-L245) for a complete implementation of this pattern.
