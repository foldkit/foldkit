# Story Subscription delivery

Implemented GitHub issue #1910 as a passive Story boundary over the selected
Block graph.

## Public shape

Root registrations retained by the selected Block facts can be emitted
directly:

```ts
Story.Subscription.emit(rootSubscriptions.pulses, RootMessage.ObservedPulse())
```

Child registrations supplied by an encapsulated provider are selected through
their Binding placement:

```ts
Story.Subscription.emit(
  Story.Subscription.at(
    [ApplicationBinding, { binding: EntriesBinding, key: 'first' }],
    entrySubscriptions.pulses,
  ),
  EntryMessage.ObservedPulse({ count: 3 }),
)
```

`Story.Subscription.at` accepts a static Binding and source, a keyed Binding,
key and source, or a checked nonempty Binding path. It shares the Binding-path
validation and delivery wrapping used by `Story.messageIn`.

The returned selector uses a named exported interface. This keeps exported
Story-step declarations nameable without exporting or leaking the private
runtime selection symbol.

Low-level update-only Stories retain the explicit registry route:

```ts
Story.Subscription.from(registry).emit(source, message)
```

Passing a graph-backed `Subscription.emit` step to that runner is rejected by
the type and produces a focused runtime error if types are erased.

## Ownership boundary

A selected parent Layer does not expose registrations contributed by a child
implementation Layer in the parent's public facts. For example, a
`RightBinding` declared from passive `LeafBlock` has an empty public
Subscription inspection even when `leafLayer` supplies `pulses` at runtime.
This is intentional Block/provider encapsulation.

Consequently:

- direct raw sources retain exact static membership checks wherever the
  selected facts expose the registration, including root registrations;
- provider-private child sources use `Subscription.at`;
- `at` checks exact membership when a Binding exposes it, and otherwise checks
  the owner-qualified source name, path ownership and key type. The owner
  component remains nominal in source types, so a different Block owner is
  rejected even when its displayed ID string is the same;
- two separately declared sources made by the same actual opaque child Block
  owner cannot be distinguished statically and are separated by exact runtime
  source identity;
- an erased source from a distinct same-named Block owner is also rejected by
  runtime identity.

No public child registry was exposed and no new source brand was introduced to
erase that boundary.

`Scene.Subscription.at` remains deliberately unchanged in this focused Story
addition: it selects keyed Bindings with `at(binding, key, source)`. Scene does
not gain the static-Binding or nested-path overloads described above, and its
existing raw registration checks are unchanged.

## Runtime behavior

The Block-aware resolver reads the acquired graph's existing Subscription
declarations. Raw sources use the existing identity, declared Message Schema,
mapper and ambiguity checks. Selected child sources resolve the checked Binding
path, validate against the leaf graph's declarations, apply the existing
Subscription mapper chain, then wrap the resulting Message through the same
generated Binding delivery envelopes as `messageIn`.

Construction remains passive. Story does not start a handler or Stream and
does not model Runtime lifecycle generations or activity. Child update,
Commands and OutMessage policy execute through the selected graph's ordinary
update path.

The main runtime fixture builds its root through ordinary
`Block.makeLayer({ init, update, subscriptions, EffectsLayer })` record
completion. Its child remains a custom constructor Layer, so the suite covers
normal parent completion and custom child acquisition together.

## Coverage

Focused runtime coverage exercises:

- direct root delivery;
- static, nested and keyed `Subscription.at` delivery;
- the same source reused across two placements, with ambiguity for an erased
  raw call and explicit placement selection;
- grouped steps;
- pending Command preservation and subsequent resolution;
- nested child OutMessage folds;
- passive handler construction;
- foreign sources, silent sources and invalid decoded payloads;
- update-only rejection and the existing `Subscription.from(registry)` path.

Declaration fixtures exercise accepted static/keyed/path selections, decoded
payloads, silent sources, wrong owners, checked path ownership and the
update-only boundary. No in-repository consumer relied on a previous direct
graph-backed API; this API is new. Existing update-only consumers continue to
use `Subscription.from(registry).emit` unchanged.

Verification on 2026-11-07:

- Foldkit TypeScript source check: passed.
- Story Subscription, keyed lifecycle, `messageIn`, and explicit registry
  focused tests: passed.
- Full Foldkit Vitest run: 268 files and 4,319 tests passed; one file and one
  test skipped.
- Story Binding-path declaration fixture: passed.
- Story Binding-path source fixtures passed with TypeScript 7.1.0-beta and
  TypeScript 6.0.3.
- Foldkit dist rebuilt; targeted external declaration emission and relocated
  consumer checking for `story-message-in-path` passed without a private
  selector-symbol reference.
- The complete emitted-declaration gate passed, including every external emit,
  invalid consumer, relocation, compiler diagnostic and completion check.
- Unchanged Block compiler-performance budgets: passed. The tight
  `attribute-bundles-200` fixture remained exactly at its 114,226 instantiation
  ceiling and one type below its 29,370 type ceiling.

## Negative controls

- Replacing selected child `resolveSubscriptionMessage(...)` with the raw
  supplied Message caused the focused runtime suite to fail: the erased
  same-named foreign source resolved and updated the child instead of being
  rejected. The implementation was restored byte-for-byte and the suite
  passed again.
- Removing the first five new declaration-fixture `@ts-expect-error`
  directives produced five diagnostics: decoded payload mismatch,
  silent-source `never`, graph-backed emit in an update-only Story, and both
  foreign-owner static and keyed selections. Removing the additional
  same-displayed-ID nominal-owner directive independently produced its own
  owner mismatch diagnostic. The fixture was restored and passed again.
- Restoring the two former fifth-argument `any` values in
  `StoryStepsStep.steps` and the `Story.steps` input constraint caused the
  primitive and empty-object rejection directives to become unused: both
  `Story.steps(123)` and `Story.steps({})` were silently accepted. Restoring the
  `BlockSubscriptionMessageStep<any, any, any>` constraints made both fixtures
  reject again while nested valid groups retained their source, payload and
  root-owner contracts.
