import { Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Flags = Schema.Struct({ start: Schema.Number })
export type Flags = typeof Flags.Type

export const Message = defineMessageUnion({
  ClickedIncrement: {},
})
export type Message = typeof Message.Type

export const Application = defineApplication({ Model, Message })

export const ApplicationComposition = Application.makeComposition()

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: Model.make({ count: flags.start }),
}))

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  }),
)

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count ${model.count}`,
  body: h.main([h.Id('counter')], [model.count.toString()]),
}))
