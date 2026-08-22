---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': minor
---

Replace `m` with `defineMessageUnion` in `foldkit/message`. `defineMessageUnion` declares a whole Message union from one record of fields per variant instead of naming each variant once as a constructor and again in the union list.

The result is a Schema, so it decodes and nests in a Model. Its focused Message surface is exhaustive `match` plus one callable constructor per variant. Each constructor is itself a schema, which is what `Command.define` needs for its `messages` list. Use `Message.match` for exhaustive dispatch. Effect `Match` remains available for partial matching, fallbacks, and one handler shared across several tags.

This removes the `m` export. Declare Message and OutMessage as separate `defineMessageUnion()` unions, even when two variants happen to carry the same fields. Constructors stay on their owning union namespace rather than being exported as sibling bindings.

Update `@foldkit/oxlint-plugin` to recognize `defineMessageUnion()` declarations in the Message naming rules. Remove `message-binding-matches-tag`, since variants no longer have separate constructor bindings whose names can drift from their tags.

Update `create-foldkit-app` templates to declare and match Messages with the new API.

```typescript
import { Schema as S } from 'effect'
import { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedReset: {},
  ChangedCount: { count: S.Number },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedReset: () => ({ model: evo(model, { count: () => 0 }) }),
    ChangedCount: ({ count }) => ({
      model: evo(model, { count: () => count }),
    }),
  })
```
