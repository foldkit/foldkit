import { Effect } from 'effect'
import { m } from 'foldkit/message'

const CompletedSaveDraft = m('CompletedSaveDraft')
const saveDraftEffect = Effect.succeed(CompletedSaveDraft())

export const SaveDraft = {
  name: 'SaveDraft',
  effect: saveDraftEffect,
}
