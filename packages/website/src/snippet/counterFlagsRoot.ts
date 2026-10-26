import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { type Flags } from './flagsDefinition'

export const Model = Schema.Struct({
  count: Schema.Number,
  startingCount: Schema.Option(Schema.Number),
})

export const Message = defineMessageUnion({ ClickedIncrement: {} })

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

export const init = ApplicationComposition.makeInit(
  (flags: typeof Flags.Type) => ({
    model: Model.make({
      count: Option.getOrElse(flags.savedCount, () => 0),
      startingCount: flags.savedCount,
    }),
  }),
)

export const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Counter: ${model.count}`,
  body: h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [model.count.toString()],
  ),
}))
