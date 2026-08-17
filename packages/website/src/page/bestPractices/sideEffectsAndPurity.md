# Side Effects & Purity

## Overview

A correct Foldkit program is a pure description with zero side effects, period. Yes, zero (0). Your program is the Foldkit application you define: your Model, update, view, the Command values returned by update, and more. Evaluating it does not perform side effects.

Every side effect is described as an Effect: a value that represents a computation without executing it. An Effect does nothing when you construct it. The side effects still happen, but only when the Foldkit runtime runs your program and executes the Effects it produces.

Both `view` and `update` are pure functions. They take inputs and return outputs without touching the outside world.

You encapsulate side effects in exactly six places:

- [Commands](/core/commands): an Effect that performs a side effect and returns a Message. HTTP requests, DOM operations, reading from storage. This is where most of your side effects live.
- [Mount](/core/mount): an Effect run with the live `Element` when a view element enters the DOM, paired with cleanup that fires when it unmounts. The seam where view code reaches a real DOM node, like portaling an overlay to the body or handing the element to a third-party library that owns its own DOM.
- [flags](/core/init-and-flags#flags): an Effect that returns the initial data your program needs to start. Reading from local storage, detecting browser capabilities, or fetching configuration.
- [Subscription](/core/subscriptions) streams: a `Stream<Message>`. Subscriptions model ongoing processes like keyboard events, window resizing, or intersection observers. When a stream callback needs to perform a side effect before producing a Message (like calling `event.preventDefault()`), use `Stream.mapEffect`. The runtime controls when streams subscribe and unsubscribe based on your Model.
- [Resources](/core/resources): an Effect Layer that provides long-lived services to your Commands. One-time setup like assembling an RPC client or opening a database connection.
- [Managed Resources](/core/managed-resources): `acquire` and `release` Effects for stateful resources that activate and deactivate based on your Model. Camera streams, WebSocket connections, media recorders.

That’s it. Every side effect in your program is an Effect value, managed by the runtime. Your logic is pure.

## Why Zero Side Effects?

Foldkit gains powerful guarantees from zero side effects:

- DevTools replay: the DevTools can replay any sequence of Messages against your `update` function because it’s pure. If `update` had side effects, replaying would double-fire them.
- Time-travel debugging: you can jump to any point in your app’s history and see exactly what the Model looked like, because each state is a deterministic function of the previous state plus the Message.
- Predictability: reading `update` tells you everything about how a Message changes the Model. There are no hidden effects, no action-at-a-distance, no callbacks firing behind the scenes.

## Common Mistakes

- `console.log` in `update`: `console.log` during development is fine for quick debugging. But production logging or error monitoring is a side effect that belongs in a Command. It will fire again during DevTools replay, and you want structured control over what gets reported.
- `Date.now()` in `update`: calling `Date.now()` breaks purity because the same Model and Message produce different results depending on when they run. Request the current time via a Command using Effect’s [DateTime](https://effect.website/docs/data-types/datetime/) module and return it as a Message.
- `fetch` in `view`: the view is called on every render. Instead, return a Command from `update` that fetches your data and returns a Message. Handle the Message to update your Model.
- DOM access anywhere: reading `document.getElementById` or `window.innerWidth` breaks purity. Use Subscriptions for reactive values, or Commands for one-off reads.

## Pure Functions Everywhere {#pure-functions}

### View is Pure

- No hooks, no lifecycle methods
- No fetching data, no timers, no subscriptions
- Given the same Model, always returns the same Html

::Snippet{name="viewPureBad" label="bad view example" class="mb-4"}

::Snippet{name="viewPureGood" label="good view example"}

### Update is Pure

- Returns a new Model and a list of Commands. It doesn’t execute anything. Each Command carries a name for tracing and testing. Foldkit runs the provided Commands.
- No mutations, no side effects
- Given the same Model and Message, always returns the same result

::Snippet{name="updatePureBad" label="bad update example" class="mb-4"}

::Snippet{name="updatePureGood" label="good update example"}

This purity has a practical payoff: testing is trivial. Foldkit ships `foldkit/test`: a simulation module that lets you send Messages, declare Command resolvers, and assert on the Model in a single pipe chain. See the [Testing](/testing) guide for the full API.

## Requesting Values

A common mistake is computing random or time-based values directly in `update`. This breaks purity. Calling the function twice with the same inputs would return different results.

### Don’t Compute in Update

::Snippet{name="pureUpdateBad" label="bad example"}

### Request Via Command

Instead, return a Command that generates the value and sends it back as a Message:

::Snippet{name="pureUpdateGood" label="good example"}

This “request/response” pattern keeps `update` pure. The `RequestedApple` handler always returns the same result. It just emits a Command. The actual random generation happens in the Effect, and the result comes back via `CompletedGenerateApplePosition`.

See the [Snake example](https://github.com/foldkit/foldkit/blob/main/examples/snake/src/main.ts#L220-L234) for a complete implementation of this pattern.
