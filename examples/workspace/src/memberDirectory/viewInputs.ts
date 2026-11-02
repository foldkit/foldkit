import { Schema } from 'effect'

import { Issue, Member } from '../domain'

export const ViewInputs = Schema.Struct({
  members: Schema.Array(Member),
  issues: Schema.Array(Issue),
  issueHrefs: Schema.Record(Schema.String, Schema.String),
})
export type ViewInputs = typeof ViewInputs.Type
