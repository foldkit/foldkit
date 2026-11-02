import { Schema } from 'effect'

import { Issue, Member } from '../domain'

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue),
  members: Schema.Array(Member),
  issueHrefs: Schema.Record(Schema.String, Schema.String),
  isSaving: Schema.optionalKey(Schema.Boolean),
})
export type ViewInputs = typeof ViewInputs.Type
