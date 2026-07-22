import { Effect, Match as M, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Interruptible from '../../command/interruptible/index.js'
import { type Document, html } from '../../html/index.js'
import { m } from '../../message/index.js'
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

export const ClickedSaveDraft = m('ClickedSaveDraft')
export const SucceededSaveDraft = m('SucceededSaveDraft', {
  revision: S.Number,
})

export const Message = S.Union([ClickedSaveDraft, SucceededSaveDraft])
export type Message = typeof Message.Type

// COMMAND

export const SaveDraftArgs = S.Struct({ revision: S.Number })
export type SaveDraftArgs = typeof SaveDraftArgs.Type

export const SaveDraft = Interruptible.define(
  'SaveDraft',
  SaveDraftArgs.fields,
  SucceededSaveDraft,
)(({ revision }) => Effect.as(Effect.never, SucceededSaveDraft({ revision })))

// INIT

export const initialModel: Model = { revision: 0, status: 'Editing' }

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedSaveDraft: () => [
        evo(model, { status: () => 'Saving' }),
        [SaveDraft({ revision: model.revision })],
      ],
      SucceededSaveDraft: () => [evo(model, { status: () => 'Saved' }), []],
    }),
  )

// VIEW

export const view = (model: Model): Document => {
  const h = html<Message>()

  const body = h.div(
    [],
    [
      h.button([h.OnClick(ClickedSaveDraft())], ['Save draft']),
      h.span([], [`draft: ${model.status}`]),
    ],
  )

  return { title: 'Drafts', body }
}
