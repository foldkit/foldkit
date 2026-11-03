import { Schema } from 'effect'

import { Comment, Member } from '../../../../domain'

export const ViewInputs = Schema.Struct({
  members: Schema.Array(Member),
  comments: Schema.Array(Comment),
  authorId: Schema.String,
})
export type ViewInputs = typeof ViewInputs.Type
