import { Option, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  body: Schema.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedBody: { value: Schema.String },
  InsertedText: { value: Schema.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  body: '',
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedBody: ({ value }) => ({
      model: evo(model, { body: () => value }),
    }),
    InsertedText: ({ value }) => ({
      model: evo(model, { body: body => body + value }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Id('app')],
    [
      h.div(
        [
          h.DataAttribute('testid', 'editor'),
          h.Contenteditable('true'),
          h.Role('textbox'),
          h.OnInput(value => Message.UpdatedBody({ value })),
          h.OnBeforeInputPreventDefault((inputType, data) =>
            inputType === 'insertText'
              ? Option.map(data, value => Message.InsertedText({ value }))
              : Option.none(),
          ),
        ],
        [model.body],
      ),
    ],
  )
}
