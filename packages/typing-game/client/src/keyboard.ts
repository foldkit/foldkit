import { Stream } from 'effect'
import { Subscription } from 'foldkit'

export const capturedKeyDownStream = <Message>(
  toMessage: (key: string) => Message,
): Stream.Stream<Message> =>
  Subscription.fromEvent<KeyboardEvent, Message>({
    target: document,
    type: 'keydown',
    toMessage: keyboardEvent => {
      keyboardEvent.preventDefault()
      return toMessage(keyboardEvent.key)
    },
  })
