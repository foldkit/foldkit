import { Array, Duration, Effect, Option, Random, Schema } from 'effect'

export const Post = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  excerpt: Schema.String,
})
export type Post = typeof Post.Type

export const PostDetail = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  author: Schema.String,
  body: Schema.String,
})
export type PostDetail = typeof PostDetail.Type

export const Stats = Schema.Struct({
  activeUsers: Schema.Number,
  requestsPerSecond: Schema.Number,
  cacheHitRatePercent: Schema.Number,
})
export type Stats = typeof Stats.Type

const SERVER_LATENCY = Duration.millis(700)
const UNAVAILABLE_POST_ID = 'unavailable-post'

type Article = Readonly<{
  id: string
  title: string
  excerpt: string
  author: string
  body: string
}>

const articles: ReadonlyArray<Article> = [
  {
    id: 'model-is-the-cache',
    title: 'The Model Is the Cache',
    excerpt: 'Why a single source of truth needs no query client.',
    author: 'Maya Okafor',
    body: 'A cache is a place where fetched data lives between requests. In The Elm Architecture that place already exists: the Model. Store each query as a small state machine and every view reads the same truth.',
  },
  {
    id: 'stale-while-revalidate',
    title: 'Stale-While-Revalidate, Explained',
    excerpt: 'Show the old data while the new data loads.',
    author: 'Theo Lindqvist',
    body: 'Dropping back to a spinner throws away perfectly good data. A Refreshing state carries the previous value while the fetch runs, so the screen never goes blank.',
  },
  {
    id: 'query-keys-are-names',
    title: 'Query Keys Are Just Names',
    excerpt: 'A Model field per query replaces stringly-typed keys.',
    author: 'Priya Raman',
    body: 'When queries are known statically, the field name is the key. Reach for a HashMap keyed by a domain identifier only when the entries are genuinely dynamic, like these post details.',
  },
  {
    id: 'refresh-is-a-message',
    title: 'Refresh Is a Message',
    excerpt: 'Requesting newer data is a fact, not hidden framework policy.',
    author: 'Jonas Weber',
    body: 'Dispatch a Message, move the entry to Refreshing, and return the fetch Command. The old value stays available while the request runs, and the whole policy remains visible in update.',
  },
]

const posts = [
  ...Array.map(articles, ({ id, title, excerpt }) =>
    Post.make({ id, title, excerpt }),
  ),
  Post.make({
    id: UNAVAILABLE_POST_ID,
    title: 'This Post Is Unavailable',
    excerpt: 'Open it to see the Failure and Retry states.',
  }),
]

const postDetails = Array.map(articles, ({ id, title, author, body }) =>
  PostDetail.make({ id, title, author, body }),
)

export const fetchPosts = Effect.gen(function* () {
  yield* Effect.sleep(SERVER_LATENCY)

  return posts
})

export const fetchPostDetail = (
  postId: string,
): Effect.Effect<PostDetail, string> =>
  Effect.gen(function* () {
    yield* Effect.sleep(SERVER_LATENCY)

    return yield* Option.match(
      Array.findFirst(postDetails, ({ id }) => id === postId),
      {
        onNone: () =>
          Effect.fail('This post is unavailable. You can try again.'),
        onSome: Effect.succeed,
      },
    )
  })

export const fetchStats = Effect.gen(function* () {
  yield* Effect.sleep(SERVER_LATENCY)

  const activeUsers = yield* Random.nextIntBetween(80, 140)
  const requestsPerSecond = yield* Random.nextIntBetween(900, 1600)
  const cacheHitRatePercent = yield* Random.nextIntBetween(86, 99)

  return Stats.make({ activeUsers, requestsPerSecond, cacheHitRatePercent })
})
