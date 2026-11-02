import { Effect, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ApplicationBlock } from './block'
import { ApplicationDefinition } from './definition'
import { SettingsBinding } from './settingsBinding'

// message.ts declares only facts owned by this application.
export const Message = defineMessageUnion({
  ClickedResetSettings: {},
})
export type Message = typeof Message.Type
// composition.ts derives the complete dispatch Codec from registered Bindings.
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

// Persistence and replay use the acquired graph's complete dispatch Codec.
export const messageDecoder = Effect.gen(function* () {
  const application = yield* ApplicationBlock.get

  return Schema.decodeUnknownSync(application.Message)
}).pipe(Effect.provide(ApplicationBlock.layer))
