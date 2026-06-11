import { Array, Duration, Effect, Option, Random, Schema as S } from 'effect'

export const Post = S.Struct({
  id: S.String,
  title: S.String,
  excerpt: S.String,
})
export type Post = typeof Post.Type

export const PostDetail = S.Struct({
  id: S.String,
  title: S.String,
  author: S.String,
  body: S.String,
})
export type PostDetail = typeof PostDetail.Type

export const Stats = S.Struct({
  activeUsers: S.Number,
  requestsPerSecond: S.Number,
  cacheHitRatePercent: S.Number,
})
export type Stats = typeof Stats.Type

export const FLAKY_POST_ID = 'flaky-connection'

const SERVER_LATENCY = Duration.millis(700)

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
    id: 'invalidation-is-a-message',
    title: 'Invalidation Is a Message',
    excerpt: 'Marking data stale is a fact, not a framework feature.',
    author: 'Jonas Weber',
    body: 'Invalidation means the cached value can no longer be trusted. Dispatch a Message, move the entry to Refreshing, and return the fetch Command. The whole policy is visible in update.',
  },
  {
    id: FLAKY_POST_ID,
    title: 'This Post Fails Every Other Fetch',
    excerpt: 'Open it to see the Failure state, then retry.',
    author: 'Flaky McNetwork',
    body: 'You made it. The fake server failed your first attempt on purpose and succeeded on the retry, which is exactly the round trip a Failure state plus a retry Message is for.',
  },
]

const posts = Array.map(articles, ({ id, title, excerpt }) =>
  Post.make({ id, title, excerpt }),
)

const postDetails = Array.map(articles, ({ id, title, author, body }) =>
  PostDetail.make({ id, title, author, body }),
)

export const fetchPostsFromServer = Effect.gen(function* () {
  yield* Effect.sleep(SERVER_LATENCY)

  return posts
})

// NOTE: Module-level mutation simulates a flaky server so the Failure and
// retry path is reachable from the UI. The Foldkit app itself never mutates.
let flakyAttemptCount = 0

export const fetchPostDetailFromServer = (
  postId: string,
): Effect.Effect<PostDetail, string> =>
  Effect.gen(function* () {
    yield* Effect.sleep(SERVER_LATENCY)

    if (postId === FLAKY_POST_ID) {
      flakyAttemptCount += 1

      if (flakyAttemptCount % 2 === 1) {
        return yield* Effect.fail(
          'The connection dropped. Retry to fetch this post again.',
        )
      }
    }

    return yield* Option.match(
      Array.findFirst(postDetails, ({ id }) => id === postId),
      {
        onNone: () => Effect.fail(`No post found with id ${postId}`),
        onSome: Effect.succeed,
      },
    )
  })

export const fetchStatsFromServer = Effect.gen(function* () {
  yield* Effect.sleep(SERVER_LATENCY)

  const activeUsers = yield* Random.nextIntBetween(80, 140)
  const requestsPerSecond = yield* Random.nextIntBetween(900, 1600)
  const cacheHitRatePercent = yield* Random.nextIntBetween(86, 99)

  return Stats.make({ activeUsers, requestsPerSecond, cacheHitRatePercent })
})
