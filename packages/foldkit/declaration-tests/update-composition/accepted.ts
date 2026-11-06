import * as Story from 'foldkit/story'

import { EditorBinding } from './composition.js'
import * as Editor from './editor.js'

export const editedChild = Story.messageIn(
  EditorBinding,
  Editor.Message.UpdatedText({ text: 'Edited' }),
)

export { ApplicationBlock, layer } from './block.js'
export { SaveDraft } from './command.js'
export {
  ApplicationComposition,
  EditorBinding,
  makeUpdate,
} from './composition.js'
export { Message, Model } from './definition.js'
export { commonUpdates } from './sharedUpdates.js'
export { editDocument, update } from './update.js'
export {
  MessageFreeBlock,
  messageFreeLayer,
  messageFreeUpdate,
  RoutedBlock,
  routedLayer,
  routedUpdate,
  makeGenericUpdate,
  makeConditionalUpdates,
  numberUpdate,
} from './metadata.accepted.js'
export type {
  ConditionalStagesKeepCommands,
  RepeatedFocusedStagesKeepCommands,
} from './metadata.accepted.js'
export type {
  ExactCommandRequirements,
  ExactTitleRequirements,
  RemoteDraftKeepsItsChannels,
} from './checks.js'
