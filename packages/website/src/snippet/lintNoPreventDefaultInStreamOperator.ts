import { Effect, Option, Stream } from 'effect'
import { Subscription } from 'foldkit'

// ❌ Bad: the Stream operator runs after the native listener returns.
const keyboardBad = Stream.fromEventListener<KeyboardEvent>(
  document,
  'keydown',
).pipe(
  Stream.mapEffect(event =>
    Effect.sync(() => {
      event.preventDefault()
      return Message.PressedKey({ key: event.key })
    }),
  ),
)

// ✅ Good: cancellation happens before the native listener returns.
const keyboardGood = Subscription.fromEventPreventDefault<
  KeyboardEvent,
  Message
>({
  target: document,
  type: 'keydown',
  toMessage: event =>
    event.key === 'Tab'
      ? Option.some(Message.PressedKey({ key: event.key }))
      : Option.none(),
})
