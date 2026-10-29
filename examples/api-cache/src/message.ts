import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { FetchedPostDetail, FetchedPosts, FetchedStats } from './model'

export const Message = defineMessageUnion({
  ClickedPost: { postId: Schema.String },
  ClickedBackToPosts: {},
  ClickedInvalidatePosts: {},
  ClickedRetryPosts: {},
  ClickedRetryPostDetail: { postId: Schema.String },
  ClickedRefreshStats: {},
  ClickedRetryStats: {},

  TickedRevalidateStats: {},

  CompletedFetchPosts: { result: Schema.Result(FetchedPosts, Schema.String) },
  CompletedFetchPostDetail: {
    postId: Schema.String,
    result: Schema.Result(FetchedPostDetail, Schema.String),
  },
  CompletedFetchStats: { result: Schema.Result(FetchedStats, Schema.String) },
})
export type Message = typeof Message.Type
