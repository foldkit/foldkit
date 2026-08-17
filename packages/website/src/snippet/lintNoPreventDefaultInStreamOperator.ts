import { Effect, Option, Stream } from 'effect'
import { Subscription } from 'foldkit'

// ❌ Bad: fromEventListener queues the event and returns before mapEffect runs.
const keyboardBad = Stream.fromEventListener<KeyboardEvent>(
  document,
  'keydown',
).pipe(
  Stream.mapEffect(event =>
    Effect.sync(() => {
      event.preventDefault() // The browser may have started its default action.
      return Message.PressedKey({ key: event.key })
    }),
  ),
)

// ✅ Good: Some marks Tab handled, so Foldkit cancels it inside the listener.
const keyboardGood = Subscription.fromEventFilterMapPreventDefault({
  target: document,
  type: 'keydown',
  toMessage: event =>
    event.key === 'Tab'
      ? Option.some(Message.PressedKey({ key: event.key }))
      : Option.none(),
})
