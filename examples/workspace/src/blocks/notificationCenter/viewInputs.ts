import { Schema } from 'effect'

import { Issue, Member } from '../../domain'

export const ViewInputs = Schema.Struct({
  members: Schema.Array(Member),
  issues: Schema.Array(Issue),
  activeMemberId: Schema.String,
})
export type ViewInputs = typeof ViewInputs.Type
