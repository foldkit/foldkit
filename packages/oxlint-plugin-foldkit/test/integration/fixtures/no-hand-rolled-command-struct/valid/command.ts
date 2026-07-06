import { Effect } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedSaveDraft = m('CompletedSaveDraft')
const saveDraftEffect = Effect.succeed(CompletedSaveDraft())

export const SaveDraft = Command.define(
  'SaveDraft',
  CompletedSaveDraft,
)(saveDraftEffect)
