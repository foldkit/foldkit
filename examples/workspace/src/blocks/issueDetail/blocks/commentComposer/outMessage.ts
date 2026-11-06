import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../../../domain'

export const OutMessage = defineMessageUnion({
  AddedComment: { comment: Issue.Comment },
})
export type OutMessage = typeof OutMessage.Type
