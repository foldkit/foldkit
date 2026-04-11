import { Effect, HashMap, Ref } from 'effect'

export type NonceTracker = Readonly<{
  registerNonce: (nonce: string) => Effect.Effect<boolean>
}>

const NONCE_SWEEP_THRESHOLD = 1024

const sweepExpired = (
  seen: HashMap.HashMap<string, number>,
  nowMillis: number,
): HashMap.HashMap<string, number> =>
  HashMap.filter(seen, expiresAtMillis => expiresAtMillis > nowMillis)

export const makeNonceTracker = (
  retentionSeconds: number,
): Effect.Effect<NonceTracker> =>
  Effect.gen(function* () {
    const seenRef = yield* Ref.make(HashMap.empty<string, number>())

    const registerNonce = (nonce: string): Effect.Effect<boolean> =>
      Ref.modify(
        seenRef,
        (seen): [boolean, HashMap.HashMap<string, number>] => {
          const nowMillis = Date.now()
          const expiresAtMillis = nowMillis + retentionSeconds * 1000

          const baseSeen =
            HashMap.size(seen) > NONCE_SWEEP_THRESHOLD
              ? sweepExpired(seen, nowMillis)
              : seen

          if (HashMap.has(baseSeen, nonce)) {
            return [false, baseSeen]
          }
          return [true, HashMap.set(baseSeen, nonce, expiresAtMillis)]
        },
      )

    return { registerNonce }
  })
