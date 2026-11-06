import { Schema } from 'effect'

import { Issue, Member } from '../../../../domain'

export const ViewInputs = Schema.Struct({
  members: Schema.Array(Member.Member),
  comments: Schema.Array(Issue.Comment),
  authorId: Schema.String,
})
export type ViewInputs = typeof ViewInputs.Type
