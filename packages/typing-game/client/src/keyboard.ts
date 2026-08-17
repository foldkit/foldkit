import { Option, Stream } from 'effect'
import { Subscription } from 'foldkit'

export const capturedKeyDownStream = <Message>(
  toMessage: (key: string) => Message,
): Stream.Stream<Message> =>
  Subscription.fromEventFilterMapPreventDefault({
    target: document,
    type: 'keydown',
    toMessage: keyboardEvent => Option.some(toMessage(keyboardEvent.key)),
  })
