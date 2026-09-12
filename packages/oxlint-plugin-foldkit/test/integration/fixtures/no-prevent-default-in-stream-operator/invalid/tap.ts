import { Effect, Stream } from 'effect'

export const wheelLock = Stream.fromEventListener<WheelEvent>(
  window,
  'wheel',
).pipe(Stream.tap(event => Effect.sync(() => event.preventDefault())))
