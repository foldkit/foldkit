---
'foldkit': minor
---

Support the wrapped keyed child shorthand for a required `Schema.Option` field containing one Struct wrapper. Keyed identity does not require a collection: an Application can hold at most one Room while retaining its room ID for delivery and stale-result isolation.

```ts
const MaybeRoomInstanceBinding =
  ApplicationDefinition.makeOptionalKeyedFieldBinding(RoomBlock, {
    field: 'maybeRoomInstance',
    key: 'roomId',
    childField: 'model',
  })
```

The parent Schema supplies the wrapper, key, and exact child Model types. `None` means absent. Folds and operations replace only the matching wrapper's child Model, preserve its other fields, and never create an absent instance. A missing or different key leaves the exact parent Model unchanged. Placement defaults to the child Block ID.

Optional presence remains parent-owned. Use the registered `MaybeRoomInstanceBinding.init({ key, args, toParentModel })` operation for dynamic creation and its lifted Commands. Automatic `init.instances` assembly is supported for arrays, not Option-wrapped storage. `subscriptions.when` gates only that occurrence's Streams; absence gates all of its lifecycle work. Conflicting accessor policies, optional or incompatible wrapper fields, and invalid keys are rejected.
