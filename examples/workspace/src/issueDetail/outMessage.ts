import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../domain'

export const OutMessage = defineMessageUnion({
  Saved: { issue: Issue },
  ReceivedIssue: { issue: Issue },
  Closed: {},
})
