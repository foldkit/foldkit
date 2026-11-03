import { String } from 'effect'

import {
  MessageComposerComposition,
  makeFieldsStep,
} from './blockInMessageDefinition'
import { inMessageUpdate as baseInMessageUpdate } from './blockInMessageHandlers'

const { makeInMessageUpdate } = MessageComposerComposition

const trimDraft = makeFieldsStep(() => ({ text: String.trim }))

const normalizeDraft = makeInMessageUpdate.on(['InformedOfDraftChanged'])(
  trimDraft,
)

export const inMessageUpdate = makeInMessageUpdate.compose(
  baseInMessageUpdate,
  normalizeDraft,
)
