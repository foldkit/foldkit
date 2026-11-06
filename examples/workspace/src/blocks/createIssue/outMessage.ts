import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const OutMessage = defineMessageUnion({
  Created: { issue: Issue.Issue },
})
export type OutMessage = typeof OutMessage.Type
