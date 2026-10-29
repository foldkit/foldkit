import { defineMessageUnion } from 'foldkit/message'

import { Comment } from '../domain'

export const OutMessage = defineMessageUnion({
  AddedComment: { comment: Comment },
})
export type OutMessage = typeof OutMessage.Type
