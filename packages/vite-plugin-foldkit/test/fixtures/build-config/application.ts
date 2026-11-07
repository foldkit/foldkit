import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
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

const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([Flags]),
  view: { kind: 'Document' },
  Model,
  Message,
})
export const ApplicationComposition = ApplicationBlock.makeComposition()

export const init = ApplicationComposition.makeInit(flags => ({
  model: Model.make({ count: flags.start }),
}))

export const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count ${model.count}`,
  body: h.main([h.Id('counter')], [model.count.toString()]),
}))

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
