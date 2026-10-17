import { Clock, Effect, Schema, pipe } from 'effect'

import { fetchPostDetail, fetchPosts, fetchStats } from './data'
import { Application } from './definition'
import { Message } from './message'
import { FetchedPostDetail, FetchedPosts, FetchedStats } from './model'

export const FetchPosts = Application.command('FetchPosts', {
  messages: [Message.CompletedFetchPosts],
  handler: function* () {
    const clock = yield* Clock.Clock

    return () =>
      pipe(
        Effect.gen(function* () {
          const posts = yield* fetchPosts
          const fetchedAt = yield* clock.currentTimeMillis

          return FetchedPosts.make({ posts, fetchedAt })
        }),
        Effect.result,
        Effect.map(result => Message.CompletedFetchPosts({ result })),
      )
  },
})

export const FetchPostDetail = Application.command('FetchPostDetail', {
  args: { postId: Schema.String },
  messages: [Message.CompletedFetchPostDetail],
  handler: function* () {
    const clock = yield* Clock.Clock

    return ({ postId }) =>
      pipe(
        Effect.gen(function* () {
          const detail = yield* fetchPostDetail(postId)
          const fetchedAt = yield* clock.currentTimeMillis

          return FetchedPostDetail.make({ detail, fetchedAt })
        }),
        Effect.result,
        Effect.map(result =>
          Message.CompletedFetchPostDetail({ postId, result }),
        ),
      )
  },
})

export const FetchStats = Application.command('FetchStats', {
  messages: [Message.CompletedFetchStats],
  handler: function* () {
    const clock = yield* Clock.Clock

    return () =>
      pipe(
        Effect.gen(function* () {
          const stats = yield* fetchStats
          const fetchedAt = yield* clock.currentTimeMillis

          return FetchedStats.make({ stats, fetchedAt })
        }),
        Effect.result,
        Effect.map(result => Message.CompletedFetchStats({ result })),
      )
  },
})
