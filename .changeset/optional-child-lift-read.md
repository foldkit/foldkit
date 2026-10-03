---
'foldkit': minor
'@foldkit/devtools': minor
---

Require an `Option`-returning `read` in both `Subscription.lift` and `ManagedResource.lift`, matching `Update.foldChild`. A child can exist in only some parent states without a separate presence check and throwing extractor. Returning `None` stops its Subscriptions or releases its Managed Resources without reading child dependencies or requirements.

This is a breaking change. Rename `toChildModel` to `read` in both lift APIs. For Subscriptions, wrap an always-present child in `Option.some`:

```ts
Subscription.lift(Settings.subscriptions)<Model, Message>({
  read: model => Option.some(model.settings),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})
```

For an optional child, return its `Option` directly and remove any `when` used only to check that child's presence:

```ts
Subscription.lift(Home.subscriptions)<Model, Message>({
  read: model => model.maybeHome,
  toParentMessage: message => Message.GotHomeMessage({ message }),
})
```

ManagedResource readers already return `Option`, so only the field name changes. Subscription `when` predicates remain available for additional whole-record or per-entry conditions. A closed gate skips `read`; a missing child stops every entry, including entries omitted from a gate map.

Every lifted Subscription now exposes `GatedDependencies<ChildDependencies>` with a `maybeDependencies` field, including lifts without `when` and entries omitted from per-entry gates. Update code that directly inspects lifted dependency records accordingly. Child definitions keep their existing dependency types, services, and `keepAliveEquivalence` behavior. Migrate the DevTools overlay to the new reader contract.

DevTools now requires Foldkit 0.166.0 or newer because its overlay uses the new `read` field.
