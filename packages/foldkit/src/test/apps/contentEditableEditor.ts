import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command/index.js'
import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  body: S.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const UpdatedBody = m('UpdatedBody', { value: S.String })
export const InsertedText = m('InsertedText', { value: S.String })

export const Message = S.Union([UpdatedBody, InsertedText])
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  body: '',
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      UpdatedBody: ({ value }) => [{ ...model, body: value }, []],
      InsertedText: ({ value }) => [{ ...model, body: model.body + value }, []],
    }),
  )

// VIEW

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Id('app')],
    [
      h.div(
        [
          h.DataAttribute('testid', 'editor'),
          h.Contenteditable('true'),
          h.Role('textbox'),
          h.OnInput(value => UpdatedBody({ value })),
          h.OnBeforeInputPreventDefault((inputType, data) =>
            inputType === 'insertText'
              ? Option.map(data, value => InsertedText({ value }))
              : Option.none(),
          ),
        ],
        [model.body],
      ),
    ],
  )
}
