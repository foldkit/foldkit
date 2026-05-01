// @ts-nocheck
import {
  Array,
  Data,
  Effect,
  HashMap,
  Random,
  SubscriptionRef,
  pipe,
} from 'effect'

import { RoomByIdStore } from './store.js'

const NUM_WORDS_IN_ID = 3
const DELIMITER = '-'

class RoomIdExists extends Data.TaggedError('RoomIdExists')<{}> {}

export const generateUniqueId = (
  words: ReadonlyArray<string>,
): Effect.Effect<string, never, RoomByIdStore> =>
  Effect.gen(function* () {
    const roomByIdStoreRef = yield* RoomByIdStore
    const roomById = yield* SubscriptionRef.get(roomByIdStoreRef)

    return yield* generateRoomId(words).pipe(
      Effect.filterOrFail(
        id => !HashMap.has(roomById, id),
        () => new RoomIdExists(),
      ),
      Effect.catch(() => generateUniqueId(words)),
    )
  })

const generateRoomId = (words: ReadonlyArray<string>) =>
  Random.nextIntBetween(0, Array.length(words)).pipe(
    Effect.replicateEffect(NUM_WORDS_IN_ID),
    Effect.map(indicesToRoomId(words)),
  )

const indicesToRoomId =
  (words: ReadonlyArray<string>) => (indices: ReadonlyArray<number>) =>
    pipe(
      indices,
      Array.map(i => Array.getUnsafe(words, i)),
      Array.join(DELIMITER),
    )
