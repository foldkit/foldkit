import { Effect, HashMap, Option, Ref } from 'effect'

export type RateLimitDecision =
  | Readonly<{ _tag: 'Allowed' }>
  | Readonly<{ _tag: 'Denied'; retryAfterSeconds: number }>

type Bucket = ReadonlyArray<number>

export type RateLimiter = Readonly<{
  check: (key: string) => Effect.Effect<RateLimitDecision>
}>

const RATE_LIMIT_SWEEP_THRESHOLD = 256

const pruneBucket = (bucket: Bucket, windowStart: number): Bucket =>
  bucket.filter(timestamp => timestamp >= windowStart)

const sweepEmptyBuckets = (
  bucketsByKey: HashMap.HashMap<string, Bucket>,
  windowStart: number,
): HashMap.HashMap<string, Bucket> =>
  HashMap.filterMap(bucketsByKey, bucket => {
    const pruned = pruneBucket(bucket, windowStart)
    return pruned.length === 0 ? Option.none() : Option.some(pruned)
  })

export const makeRateLimiter = (
  maxRequests: number,
  windowSeconds: number,
): Effect.Effect<RateLimiter> =>
  Effect.gen(function* () {
    const bucketsByKeyRef = yield* Ref.make(HashMap.empty<string, Bucket>())

    const check = (key: string): Effect.Effect<RateLimitDecision> =>
      Ref.modify(
        bucketsByKeyRef,
        (
          bucketsByKey,
        ): [RateLimitDecision, HashMap.HashMap<string, Bucket>] => {
          const nowSeconds = Math.floor(Date.now() / 1000)
          const windowStart = nowSeconds - windowSeconds

          const currentBucket = Option.match(HashMap.get(bucketsByKey, key), {
            onNone: (): Bucket => [],
            onSome: bucket => pruneBucket(bucket, windowStart),
          })

          const shouldSweep =
            HashMap.size(bucketsByKey) > RATE_LIMIT_SWEEP_THRESHOLD
          const sweptBuckets = shouldSweep
            ? sweepEmptyBuckets(bucketsByKey, windowStart)
            : bucketsByKey

          if (currentBucket.length >= maxRequests) {
            const oldestTimestamp = currentBucket[0] ?? nowSeconds
            const retryAfterSeconds = Math.max(
              1,
              oldestTimestamp + windowSeconds - nowSeconds,
            )
            const decision: RateLimitDecision = {
              _tag: 'Denied',
              retryAfterSeconds,
            }
            return [decision, HashMap.set(sweptBuckets, key, currentBucket)]
          }

          const nextBucket: Bucket = [...currentBucket, nowSeconds]
          const decision: RateLimitDecision = { _tag: 'Allowed' }
          return [decision, HashMap.set(sweptBuckets, key, nextBucket)]
        },
      )

    return { check }
  })
