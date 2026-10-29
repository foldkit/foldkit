import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
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
