import { Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({ label: Schema.String })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLogout: {},
  CompletedAction: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  RequestedLogout: {},
})

export type OutMessage = typeof OutMessage.Type

// INIT

export const initialModel: Model = { label: 'Log out' }

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      ClickedLogout: () => ({
        model,
        outMessage: OutMessage.RequestedLogout(),
      }),
      CompletedAction: () => ({ model }),
    },
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedLogout()), h.Role('button')],
        [model.label],
      ),
    ],
  )
}
