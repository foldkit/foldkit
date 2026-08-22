import { Effect, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import type { Document, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const SaveStatus = S.Literals(['Editing', 'Saving', 'Saved'])
export type SaveStatus = typeof SaveStatus.Type

export const Model = S.Struct({
  revision: S.Number,
  status: SaveStatus,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedSaveDraft: {},
  SucceededSaveDraft: { revision: S.Number },
})

export type Message = typeof Message.Type

// COMMAND

export const SaveDraftArgs = S.Struct({ revision: S.Number })
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

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
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
