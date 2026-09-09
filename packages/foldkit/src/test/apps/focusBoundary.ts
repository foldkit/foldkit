import { Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

const FocusState = Schema.Literals(['Outside', 'Within'])

export const Model = Schema.Struct({
  focusState: FocusState,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  EnteredFocusRegion: {},
  LeftFocusRegion: {},
})
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  focusState: 'Outside',
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    EnteredFocusRegion: () => ({
      model: evo(model, { focusState: () => 'Within' }),
    }),
    LeftFocusRegion: () => ({
      model: evo(model, { focusState: () => 'Outside' }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Role('region'),
      h.AriaLabel('Editor'),
      h.OnFocusEnter(Message.EnteredFocusRegion()),
      h.OnFocusLeave(Message.LeftFocusRegion()),
    ],
    [
      h.input([h.AriaLabel('Editor input')]),
      h.button([], ['Format']),
      `focus=${model.focusState}`,
    ],
  )
