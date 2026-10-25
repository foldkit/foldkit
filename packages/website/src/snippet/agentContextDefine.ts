import { Schema } from 'effect'
import { AgentContext } from 'foldkit/experimental'

import { Model } from './model'

export const WorkspaceAgentContext = AgentContext.define(
  Model,
  {
    page: Schema.Literals(['Inbox', 'Thread', 'Settings']).annotate({
      description: 'The page the person is looking at',
    }),
    maybeOpenThreadId: Schema.Option(Schema.String),
    selectedThreadIds: Schema.Array(Schema.String).annotate({
      description: 'Threads the person has checked in the list',
    }),
    filter: Schema.Literals(['All', 'Unread', 'Flagged']),
  },
  {
    read: model => ({
      page: model.page,
      maybeOpenThreadId: model.maybeOpenThreadId,
      selectedThreadIds: model.selectedThreadIds,
      filter: model.filter,
    }),
  },
)
