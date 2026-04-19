import { Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  content: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedContent = m('UpdatedContent', { value: S.String })

export const Message = S.Union(UpdatedContent)
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  content: '',
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedContent: ({ value }) => [evo(model, { content: () => value }), []],
    }),
  )
