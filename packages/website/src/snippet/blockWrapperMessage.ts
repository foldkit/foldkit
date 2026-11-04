import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { withBlock } from 'foldkit/story'

import { layer } from './block'
import { ApplicationBlock } from './definition'
import { SettingsBinding } from './settingsBinding'

// message.ts declares only facts owned by this application.
export const Message = defineMessageUnion({
  ClickedResetSettings: {},
})
export type Message = typeof Message.Type
// composition.ts derives the complete dispatch Codec from registered Bindings.
export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [SettingsBinding],
})

// Persistence and replay use the acquired graph's complete dispatch Codec.
export const messageDecoder = withBlock(
  { block: ApplicationBlock, layer },
  application => Schema.decodeUnknownSync(application.Message),
)
