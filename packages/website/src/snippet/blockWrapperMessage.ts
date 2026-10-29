import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// message.ts declares only facts owned by this application.
export const Message = defineMessageUnion({
  ClickedResetSettings: {},
})
export type Message = typeof Message.Type
// composition.ts derives the complete dispatch Codec from registered Bindings.
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

// Persistence and replay decode local facts and generated child deliveries
// through the complete Composition Codec.
export const decodeMessage = Schema.decodeUnknownSync(
  ApplicationComposition.Message,
)
