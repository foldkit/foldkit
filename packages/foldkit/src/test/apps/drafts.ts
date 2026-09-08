import { Effect, Schema } from 'effect'

import * as Command from '../../command/index.js'
import type { Document, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const SaveStatus = Schema.Literals(['Editing', 'Saving', 'Saved'])
export type SaveStatus = typeof SaveStatus.Type

export const Model = Schema.Struct({
  revision: Schema.Number,
  status: SaveStatus,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedSaveDraft: {},
  SucceededSaveDraft: { revision: Schema.Number },
})

export type Message = typeof Message.Type

// COMMAND

export const SaveDraftArgs = Schema.Struct({ revision: Schema.Number })
export type SaveDraftArgs = typeof SaveDraftArgs.Type

export const SaveDraft = Command.define('SaveDraft', {
  args: SaveDraftArgs.fields,
  messages: [Message.SucceededSaveDraft],
  interrupt: true,
  execute: ({ revision }) =>
    Effect.as(Effect.never, Message.SucceededSaveDraft({ revision })),
})

// INIT

export const initialModel: Model = { revision: 0, status: 'Editing' }

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSaveDraft: () => ({
      model: evo(model, { status: () => 'Saving' }),
      commands: [SaveDraft({ revision: model.revision })],
    }),
    SucceededSaveDraft: () => ({
      model: evo(model, { status: () => 'Saved' }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const body = h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedSaveDraft())], ['Save draft']),
      h.span([], [`draft: ${model.status}`]),
    ],
  )

  return { title: 'Drafts', body }
}
