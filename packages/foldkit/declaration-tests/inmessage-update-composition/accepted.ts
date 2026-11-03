export { ApplicationBlock } from './block.js'
export {
  ApplicationDefinition,
  InMessage,
  Message,
  Model,
  OutMessage,
  SaveDraft,
} from './definition.js'
export { makeInMessageUpdate } from './composition.js'
export { increment, focused, inMessageUpdate } from './update.js'
export { ContextBlock, InMessage as ContextInMessage } from './context.js'

import { Effect } from 'effect'

import { ApplicationBlock } from './block.js'

export const acquiredInputEntry = Effect.map(
  ApplicationBlock.get,
  block => block.inMessageUpdate,
)
