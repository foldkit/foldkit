import { Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({})
export type Message = typeof Message.Type

export const Application = defineApplication({ Model, Message })

export const ApplicationComposition = Application.makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = ApplicationComposition.makeUpdate()

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Client only',
  body: h.main([], [model.count.toString()]),
}))
