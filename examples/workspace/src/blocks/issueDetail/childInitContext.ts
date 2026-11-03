import { Schema } from 'effect'

export const ChildInitContext = Schema.Struct({
  issueId: Schema.String,
})
export type ChildInitContext = typeof ChildInitContext.Type
