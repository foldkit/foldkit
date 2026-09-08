import { Effect } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedSaveDraft: {},
})

const saveDraftEffect = Effect.succeed(Message.CompletedSaveDraft())

export const SaveDraft = {
  name: 'SaveDraft',
  effect: saveDraftEffect,
}
