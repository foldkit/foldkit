import { Schema } from 'effect'
import { Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { layer } from './block'
import { ApplicationBlock, makeComposition } from './block'
import { SettingsBinding } from './settingsBinding'

// message.ts declares only facts owned by this application.
export const Message = defineMessageUnion({
  ClickedResetSettings: {},
})
export type Message = typeof Message.Type
// composition.ts derives the complete dispatch Codec from registered Bindings.
export const ApplicationComposition = makeComposition({
  bindings: [SettingsBinding],
})

// Persistence and replay use the acquired graph's complete dispatch Codec.
export const messageDecoder = Story.withBlock(
  { block: ApplicationBlock, layer },
  application => Schema.decodeUnknownSync(application.Message),
)
