import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { AppTabs } from './model'
import { postQuery, postsQuery, statsQuery } from './query'

export const Message = defineMessageUnion({
  GotTabsMessage: { message: AppTabs.Message },
  GotPostsMessage: { message: postsQuery.Message },
  GotStatsMessage: { message: statsQuery.Message },
  GotPostMessage: { message: postQuery.Message },
  ClickedPost: { postId: Schema.String },
  ClickedBackToPosts: {},
  ClickedRefreshPosts: {},
  ClickedRetryPosts: {},
  ClickedRetryPost: { postId: Schema.String },
  ClickedRefreshStats: {},
  ClickedRetryStats: {},
  TickedStatsRefreshInterval: {},
})

export type Message = typeof Message.Type
