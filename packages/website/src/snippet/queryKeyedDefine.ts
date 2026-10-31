import { Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { Post } from './queryDefine'

const fetchPost = (postId: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(`/api/posts/${postId}`),
      catch: () => `Could not load post ${postId}`,
    })

    if (!response.ok) {
      return yield* Effect.fail(
        `Could not load post ${postId} (${response.status})`,
      )
    }

    const body = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => 'The post response was invalid',
    })

    return yield* Schema.decodeUnknownEffect(Post)(body).pipe(
      Effect.mapError(() => 'The post response was invalid'),
    )
  })

export const PostQuery = Query.define({
  name: 'Post',
  data: Post,
  error: Schema.String,
  args: { postId: Schema.String },
  staleTime: '1 minute',
  maxSettledEntries: 100,
  notifyOnCompletion: true,
  handler: function* () {
    return ({ postId }) => fetchPost(postId)
  },
})
