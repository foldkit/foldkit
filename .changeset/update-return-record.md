---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': patch
'create-foldkit-app': patch
---

Replace tuple returns from update, init, and boot with records. An update with no Commands returns `{ model }`; an update with Commands returns `{ model, commands }`. The runtime accepts both an absent `commands` field and an empty array.

Use `Update.Return<Model, Message>` for plain updates. Its `outMessage?: never` guard prevents an OutMessage-bearing return from flowing into an API that would silently discard that channel. A plain `Update.Return` still widens into `Update.ReturnWithOutMessage`, so adapters that only added an empty OutMessage slot can be deleted.

Keep the module-level `UpdateReturn` alias and use it to constrain `Message.match`:

```typescript
type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    ClickedLink: ({ request }) => ({
      model,
      commands: [loadUrl(request)],
    }),
  })
```

Submodels with an OutMessage channel now return `Update.ReturnWithOutMessage`, where `outMessage` is an optional raw value instead of an `Option`. Emit with `{ model, outMessage: OutMessage.ClearedDate() }` and omit `outMessage` when there is nothing to send. `toParentOutMessage` likewise returns the parent OutMessage or `undefined`.

`Update.foldChildStep` now accepts `toParentOutMessage` for no-argument child entry points and returns `StepWithOutMessage`, matching `foldChild` without requiring a made-up `void` input.

Because Foldkit enables `exactOptionalPropertyTypes`, `{ model, commands: maybeCommands }` does not compile when `maybeCommands` can be `undefined`. Omit the field or normalize it with `commands: maybeCommands ?? []`.

Update and init results are consumed by name. For example, use `dialogClose.model` and `dialogClose.commands ?? []` instead of positional destructuring.

Update the Foldkit UI component helpers, DevTools overlay, and generated `create-foldkit-app` templates to use the same record shape.
