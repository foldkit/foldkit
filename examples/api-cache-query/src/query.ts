import { Clock, Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import {
  Post,
  PostDetail,
  Stats,
  fetchPostDetail,
  fetchPosts,
  fetchStats,
} from './data'

const PostsData = Schema.Struct({
  posts: Schema.Array(Post),
  fetchedAt: Schema.Number,
})

const PostData = Schema.Struct({
  post: PostDetail,
  fetchedAt: Schema.Number,
})

const StatsData = Schema.Struct({ stats: Stats, fetchedAt: Schema.Number })

export const postsQuery = Query.define({
  name: 'Posts',
  data: PostsData,
  error: Schema.String,
  handler: function* () {
    const clock = yield* Clock.Clock

    return () =>
      Effect.gen(function* () {
        const posts = yield* fetchPosts
        const fetchedAt = yield* clock.currentTimeMillis

        return { posts, fetchedAt }
      })
  },
})

export const statsQuery = Query.define({
  name: 'Stats',
  data: StatsData,
  error: Schema.String,
  handler: function* () {
    const clock = yield* Clock.Clock

    return () =>
      Effect.gen(function* () {
        const stats = yield* fetchStats
        const fetchedAt = yield* clock.currentTimeMillis

        return { stats, fetchedAt }
      })
  },
})

export const postQuery = Query.define({
  name: 'Post',
  args: { postId: Schema.String },
  data: PostData,
  error: Schema.String,
  handler: function* () {
    const clock = yield* Clock.Clock

    return ({ postId }) =>
      Effect.gen(function* () {
        const post = yield* fetchPostDetail(postId)
        const fetchedAt = yield* clock.currentTimeMillis

        return { post, fetchedAt }
      })
  },
})
