import { Option, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { type Flags } from './flagsDefinition'

export const Model = Schema.Struct({
  count: Schema.Number,
  startingCount: Schema.Option(Schema.Number),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({ ClickedIncrement: {} })
export type Message = typeof Message.Type

export const Application = defineApplication({ Model, Message })

export const ApplicationComposition = Application.makeComposition()

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: Model.make({
    count: Option.getOrElse(flags.savedCount, () => 0),
    startingCount: flags.savedCount,
  }),
}))

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  }),
)

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Counter: ${model.count}`,
  body: h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [model.count.toString()],
  ),
}))
