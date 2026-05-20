---
'foldkit': minor
---

Rebuild the Subscription API around four primitives: `Subscription.make`, `Subscription.lift`, `Subscription.aggregate`, and `Subscription.persistent`.

The previous `Subscription.makeSubscriptions(Deps)<Model, Message>(configs)` shape required maintaining a `SubscriptionDependencies` struct in parallel with the field configs. Embedding a child Submodel that exposed its own Subscriptions meant reaching into the child's `SubscriptionDependencies.fields`, re-keying at the parent, and wrapping each stream individually with `Stream.map(message => GotChildMessage({ message }))`. One embedded child produced many lines of wrapping ceremony, and the structure did not mirror how `update` and `view` compose across Submodels. The new shape composes via one `lift` per child Submodel.

## Migration

### Renamed `equivalence` to `keepAliveEquivalence`

The optional `equivalence` field on a Subscription entry is renamed to `keepAliveEquivalence`. The new name spells out what the field actually gates: when the equivalence accepts two snapshots as equal, the Stream stays alive across that change; otherwise the Stream tears down and restarts.

Pure rename, behavior unchanged. Mechanical migration: replace `equivalence:` with `keepAliveEquivalence:` inside any `entry(...)` callbacks object. Other uses of the word `equivalence` in your code (Effect's `Equivalence` module imports, domain-level equivalence functions) are unaffected.

### Single-level Subscriptions

Before:

```ts
const SubscriptionDependencies = S.Struct({
  tick: S.Struct({ isRunning: S.Boolean }),
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDependencies)<
  Model,
  Message
>({
  tick: {
    modelToDependencies: model => ({ isRunning: model.isRunning }),
    dependenciesToStream: ({ isRunning }) =>
      Stream.when(
        Stream.tick(Duration.millis(100)).pipe(Stream.map(Ticked)),
        Effect.sync(() => isRunning),
      ),
  },
})
```

After:

```ts
const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isRunning: S.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.millis(100)).pipe(Stream.map(Ticked)),
          Effect.sync(() => isRunning),
        ),
    },
  ),
}))
```

The first argument to `entry` is the inline field map (the same shape you would pass to `S.Struct`). The dependency type is inferred from that map.

### Always-active Streams

Use `Subscription.persistent` for Streams whose lifecycle should match the program (no Model dependency):

```ts
const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  keyboard: Subscription.persistent(
    Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
      Stream.map(event => PressedKey({ key: event.key })),
    ),
  ),
}))
```

This replaces the previous `S.Null` + `modelToDependencies: () => null` idiom.

### Embedding a child Submodel's Subscriptions

Before:

```ts
const dragAndDropFields = Ui.DragAndDrop.SubscriptionDependencies.fields

const SubscriptionDependencies = S.Struct({
  dragPointer: dragAndDropFields['documentPointer'],
  dragEscape: dragAndDropFields['documentEscape'],
  // ...
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDependencies)<
  Model,
  Message
>({
  dragPointer: {
    modelToDependencies: model =>
      Ui.DragAndDrop.subscriptions.documentPointer.modelToDependencies(
        model.dragAndDrop,
      ),
    dependenciesToStream: (deps, readDeps) =>
      Ui.DragAndDrop.subscriptions.documentPointer
        .dependenciesToStream(deps, readDeps)
        .pipe(Stream.map(message => GotDragAndDropMessage({ message }))),
  },
  // ...one entry per child Subscription...
})
```

After:

```ts
const subscriptions = Subscription.lift({
  dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
  dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDrop,
  toParentMessage: message => GotDragAndDropMessage({ message }),
})
```

One `lift` covers an entire child Submodel's Subscriptions. Per-entry dependency schemas, `keepAliveEquivalence` settings, and the `readDependencies` thunk for keep-alive entries are preserved automatically.

### Combining multiple records

Use `Subscription.aggregate` when a level holds Subscriptions from more than one source (lifted children, inline entries, or both):

```ts
export const subscriptions = Subscription.aggregate<Model, Message>()(
  localSubscriptions,
  childASubscriptions,
  childBSubscriptions,
)
```

Duplicate keys across records throw at startup.

### Removed exports

- `Subscription.makeSubscriptions` — use `Subscription.make`.
- `Ui.DragAndDrop.SubscriptionDependencies`, `Ui.Slider.SubscriptionDependencies`, `Ui.VirtualList.SubscriptionDependencies` — compose those Subscriptions through `Subscription.lift` directly. The `subscriptions` records still ship from each module.
- `AnimationFrameSubscription` type — `Subscription.animationFrame` still returns an entry value and slots into `Subscription.make` unchanged at the call site.

See the new Patterns / Subscription Organization page for the canonical leaf, composing, and root layouts.
