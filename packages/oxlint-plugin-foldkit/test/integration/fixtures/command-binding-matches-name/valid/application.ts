import { defineApplication } from 'foldkit'
import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({ CompletedFetchUser: {} })
const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition({})

export const FetchUser = ApplicationComposition.command('FetchUser', {
  messages: [Message.CompletedFetchUser],
})
