export { ApplicationBlock, layer } from './block.js'
export {
  InMessage,
  Message,
  Model,
  OutMessage,
  SaveDraft,
} from './definition.js'
export { makeInMessageUpdate } from './composition.js'
export { increment, focused, inMessageUpdate } from './update.js'
export {
  ContextBlock,
  contextLayer,
  InMessage as ContextInMessage,
} from './context.js'

import { withBlock } from 'foldkit/story'

import { ApplicationBlock, layer } from './block.js'

export const acquiredInputEntry = withBlock(
  { block: ApplicationBlock, layer },
  block => block.inMessageUpdate,
)
