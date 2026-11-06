import { Schema } from 'effect'

import { Issue, Member } from '../../domain'

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue.Issue),
  members: Schema.Array(Member.Member),
  issueHrefsById: Schema.Record(Schema.String, Schema.String),
  isMovePending: Schema.optionalKey(Schema.Boolean),
})
export type ViewInputs = typeof ViewInputs.Type
