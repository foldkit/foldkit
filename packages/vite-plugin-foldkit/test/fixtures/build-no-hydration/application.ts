import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({})
export type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message,
})
export const ApplicationComposition = ApplicationBlock.makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = ApplicationComposition.makeUpdate({})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Client only',
  body: h.main([], [model.count.toString()]),
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
