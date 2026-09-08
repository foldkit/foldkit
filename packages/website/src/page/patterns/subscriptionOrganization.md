# Subscription Organization

## Lifting Child Subscriptions {#overview}

A Submodel owns the Subscriptions that produce its Messages. Its parent lifts those Subscriptions into the parent Model and Message types, then aggregates them with other Subscription records at that level.

This mirrors the other halves of the boundary. `Update.foldChild` lifts child update, `h.submodel` lifts child view, and `Subscription.lift` lifts child Streams.

## The Composition Levels {#composition-levels}

Each level declares local entries with `Subscription.make` and lifts child records with `Subscription.lift`. By the time a Stream reaches the root, it emits root Messages that the Runtime can dispatch through update. This diagram follows one leaf record through those lifts:

```diagram
+-------------------------------+
| ThemeMenu                     |
| Stream<ThemeMenu.Message>     |
+-------------------------------+
  |
  | Subscription.lift
  | wraps with GotThemeMenuMessage
  v
+-------------------------------+
| Settings                      |
| Stream<Settings.Message>      |
+-------------------------------+
  |
  | Subscription.lift
  | wraps with GotSettingsMessage
  v
+-------------------------------+
| Root                          |
| Stream<Message>               |
+-------------------------------+
  |
  v
Runtime
```

## The Composition Verbs {#composition-verbs}

Three functions build the hierarchy.

| Verb                     | What it does                                                                                           | When to reach for it                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `Subscription.make`      | Declares local entries from dependency Schemas, `modelToDependencies`, and `dependenciesToStream`.     | The current level owns a Subscription.            |
| `Subscription.lift`      | Reads a child Model and wraps each emitted child Message. An optional `when` adds a parent-owned gate. | A child exports a Subscriptions record.           |
| `Subscription.aggregate` | Combines records and throws at startup when two entries use the same key.                              | A level has more than one local or lifted record. |

## Organization Principles

### Submodel Cohesion

A Subscription that emits child Messages belongs inside that child's folder. The child exports it without knowing which parent will lift it.

### One Wrap Per Level

Each `subscription.ts` produces only the Message type for its level. Every `Subscription.lift` adds one wrapper, just as one `h.submodel` boundary does for view handlers.

### Uniform Interface

Export one `subscriptions` record from the child. The parent decides whether to lift every entry, gate the whole record, or gate named entries. The child does not split its exports around parent-owned conditions.

## Putting It Together

The next three snippets trace one record from a leaf, through a composing Submodel, to the root.

### The Leaf Submodel {#leaf-submodel}

A leaf declares its entries with `Subscription.make`.

::Snippet{name="subscriptionOrganizationChild" label="leaf Submodel Subscription file"}

### The Composing Submodel {#composing-submodel}

A composing Submodel lifts child records, declares any local entries, and aggregates the results.

::Snippet{name="subscriptionOrganizationComposing" label="composing Submodel Subscription file"}

### The Root {#root}

The root uses the same shape. Its lifts target the root Model and Message.

::Snippet{name="subscriptionOrganizationRoot" label="root Subscription file"}

## Gating a Lifted Record {#gating}

A child can express conditions from its own Model in its dependencies and Stream construction. It cannot see parent-owned state such as the active Route.

Put a parent-owned condition in `when` on the lift. The predicate receives the parent Model. The gated entries run only while it returns `true`.

::Snippet{name="subscriptionOrganizationGate" label="route-gated lift"}

Closing a gate tears down the Stream. Foldkit also stops calling the child's `modelToDependencies` until the gate reopens, so hidden child changes do not restart it.

`when` accepts either one predicate for the whole record or a map of predicates by entry name. An omitted entry remains ungated. For example: a Room page can keep its WebSocket alive across navigation while gating its keyboard listener to the active Room Route.

::Snippet{name="subscriptionOrganizationEntryGate" label="per-entry gated lift"}

The parent owns `when`. The child keeps its child-owned conditions in its own Subscription definition.

Attach each gate at the level that owns its condition. When a record passes through several levels, all gates compose. The entry runs only while every gate above it is open.
