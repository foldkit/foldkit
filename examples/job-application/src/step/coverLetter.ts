import { Schema as S } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  content: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedContent: { value: S.String },
})

export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  content: '',
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedContent: ({ value }) => ({
      model: evo(model, { content: () => value }),
    }),
  })
