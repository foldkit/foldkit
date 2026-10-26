# Testing event delivery

## Status

Adopt three focused test operations in one related testing change:

- `Scene.Command.keepPending` for one exact pending invocation;
- `Story.messageWith` for a Message derived from the current Model; and
- `Story.Subscription.from(subscriptions).emit(entry, message)` for registered Subscription delivery.

The design incorporates the concrete use cases reported in [PR #1780](https://github.com/foldkit/foldkit/pull/1780) and [PR #1783](https://github.com/foldkit/foldkit/pull/1783), with their contracts adjusted to current Story and Scene behavior.

## Scene Command state

Scene stores the selected Command object in private simulation state. It does not add a public flag to `AnyCommand` or clone the Command. The original invocation therefore retains its definition identity, bound occurrence, args, and generated Message mapper chain.

`keepPending` filters that exact object only from Scene's later-Message boundary check. The full pending collection remains the input to `expectHas`, `expectExact`, `expectNone`, `resolve`, `resolveAll`, `resolveAllExact`, and final completeness. A Definition or instance must select one unkept invocation; a bound instance disambiguates a keyed child occurrence.

Story needs no matching operation. Its current `message` step already delivers another fact while Commands are pending and appends Commands returned by the new update.

## Story Messages and Subscriptions

`messageWith` evaluates its callback when the step runs and passes the current Model to it. Inline callbacks receive contextual typing. Extracted reusable callbacks carry an explicit precise Model type through `Story.steps`.

`Subscription.from` accepts the registered record exposed by a completed Block. Its emitter uses the same declaration identity, decoded Schema validation, ambiguity checks, and generated mapper chain as `Scene.Subscription.emit`. It does not start Streams, evaluate dependencies, or claim that a Subscription is currently active. The tested update must accept the registered record's Message contract; the API does not require the exact update function that originally registered it.

A raw child entry is valid when it identifies one registered path. When the same child entry appears at two placements, the raw entry is ambiguous and the caller selects one bound entry from the completed Block's `subscriptions` record. `Scene.subscriptions` remains available to composition-only tests that do not yet have a completed Block; it represents the same registered graph rather than a separate neutral registry API.

`SubscriptionEmitter<Message, EmissionSource>` has no default for its source contract. Normal `Subscription.from(concreteSubscriptions)` inference retains the exact registered entry union, and an explicit emitter annotation must supply that union. The private `IsAny` branches apply only when the caller has already erased the entire Subscriptions value to `any`; they preserve that deliberate TypeScript boundary rather than widening a normally inferred emitter. Source and relocated rejected fixtures verify that ordinary inference still rejects an unregistered entry and encoded transformed-Schema input.

## Proof

The focused runtime suite covers a real keyed child Command retained by its second occurrence, a later DOM interaction, registered Subscription delivery, generated result mapping, ambiguous selection, Command assertion visibility, `resolveAllExact`, and unresolved Scene completion. It also covers inline and extracted `messageWith`, pending-Command Story delivery, and a shared child Subscription lifted to two placements.

Source, external declaration emission, and relocated consumer fixtures cover precise Model inference, exact registered entry and Message types, decoded transformed-Schema input, encoded-input rejection, keyed Scene matching, completed-Block Subscription records, and an explicit emitter annotation that retains its source contract.

The wide Subscription fixture declares 100 different Message variants and 100 entries with distinct declaration names. Measurements on the pinned compiler were 10,739 instantiations and 4,526 types for one entry, 27,388 and 6,386 for ten, and 548,398 and 24,566 for 100. Instantiation growth is not linear at the wide end, so the 100-entry result is retained as its own fixed ceiling. All five pre-existing budgets pass unchanged alongside the new fixture after a clean package-local TypeScript 7 build. A TypeScript 6 declaration-build control is excluded from release evidence.

Workspace's conflict Scene keeps the exact save invocation pending while its registered activity Subscription delivers a teammate's comment. The comment is visible before the save conflict resolves. The public installed-contract fixture also checks deferred Model reads, decoded Subscription input and pending-Command completeness; its source preflight passes, with the packed-artifact rehearsal tracked separately.

These helpers simulate update inputs only. They do not run live Stream generation, dependency changes, interruption, or Runtime occurrence admission.
