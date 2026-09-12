import { Option, Stream } from 'effect'
import { Subscription } from 'foldkit'

export const capturedKeyDownStream = <Message>(
  toMessage: (key: string) => Message,
): Stream.Stream<Message> =>
  Subscription.fromEventPreventDefault<KeyboardEvent, Message>({
    target: document,
    type: 'keydown',
    toMessage: keyboardEvent => Option.some(toMessage(keyboardEvent.key)),
  })
