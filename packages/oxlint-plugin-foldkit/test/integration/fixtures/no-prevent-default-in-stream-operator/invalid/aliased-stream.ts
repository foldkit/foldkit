import { Effect, Option, Stream as EffectStream } from 'effect'

export const wheelLock = EffectStream.fromEventListener<WheelEvent>(
  window,
  'wheel',
).pipe(EffectStream.map(event => event.preventDefault()))

export const touchFilter = EffectStream.fromEventListener<TouchEvent>(
  window,
  'touchmove',
).pipe(
  EffectStream.filterEffect(event =>
    Effect.sync(() => {
      event.preventDefault()
      return true
    }),
  ),
)

export const touchFilterMap = EffectStream.fromEventListener<TouchEvent>(
  window,
  'touchmove',
).pipe(
  EffectStream.filterMapEffect(event =>
    Effect.sync(() => {
      event.preventDefault()
      return Option.some(event)
    }),
  ),
)
