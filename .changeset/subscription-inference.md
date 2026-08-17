---
'foldkit': minor
---

Infer Subscription and ManagedResource types from the values passed to their composition helpers.

`Subscription.aggregate` and `ManagedResource.aggregate` now accept records directly without Model, Message, or service type arguments. The result preserves each named entry and its exact dependency, Schema, service, and callback types.

Before:

```ts
const subscriptions = Subscription.aggregate<Model, Message>()(
  homeSubscriptions,
  roomSubscriptions,
)

const managedResources = ManagedResource.aggregate<Model, Message>()(
  cameraManagedResources,
  socketManagedResources,
)
```

After:

```ts
const subscriptions = Subscription.aggregate(
  homeSubscriptions,
  roomSubscriptions,
)

const managedResources = ManagedResource.aggregate(
  cameraManagedResources,
  socketManagedResources,
)
```

The curried form remains available when an explicit record contract is required. The first record with a Model dependency establishes the common Model. Later records are checked against it, while Message and Effect service requirements widen across the aggregate. A record containing only `Subscription.persistent` entries does not establish the Model. Directly inferred aggregates preserve literal keys instead of adding a string index signature; use the curried form or a `Subscriptions<Model, Message>` annotation when dynamic string indexing is part of the contract.

`Subscription.fromEvent`, `fromEventFilterMap`, and `fromEventFilterMapPreventDefault` now infer the event from `target` and `type`. DOM event names are checked against the target, and the mapper receives the corresponding event type.

Before:

```ts
Subscription.fromEvent<KeyboardEvent, Message>({
  target: window,
  type: 'keydown',
  toMessage: event => Message.PressedKey({ key: event.key }),
})
```

After:

```ts
Subscription.fromEvent({
  target: window,
  type: 'keydown',
  toMessage: event => Message.PressedKey({ key: event.key }),
})
```

**Breaking:** remove the Event and Message type arguments from all three event helpers. A custom `EventTarget` that dispatches typed events now declares its event map through `Subscription.TypedEventTarget`.

Before:

```ts
const slowWarningTarget = new EventTarget()

const slowWarnings = Subscription.fromEvent<
  CustomEvent<SlowWarningReport>,
  Message
>({
  target: slowWarningTarget,
  type: 'foldkit:slow-warning',
  toMessage: event => Message.ReceivedSlowWarning({ report: event.detail }),
})
```

After:

```ts
const slowWarningTarget: Subscription.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<SlowWarningReport>
}> = new EventTarget()

const slowWarnings = Subscription.fromEvent({
  target: slowWarningTarget,
  type: 'foldkit:slow-warning',
  toMessage: event => Message.ReceivedSlowWarning({ report: event.detail }),
})
```

On a native target, the annotation adds custom events while retaining native events and overrides a native event only when it declares the same name. Named config types now take Target, Type, and Message type parameters:

Before:

```ts
type ShortcutConfig = Subscription.FromEventConfig<KeyboardEvent, Message>
```

After:

```ts
type ShortcutConfig = Subscription.FromEventConfig<Window, 'keydown', Message>
```

Apply the same change to `FromEventFilterMapConfig` and `FromEventFilterMapPreventDefaultConfig`. The prevent-default config also rejects `options: { passive: true }` at compile time; its runtime guard remains for unchecked JavaScript inputs.
