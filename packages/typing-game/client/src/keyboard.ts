import { Option, Stream } from 'effect'
import { Browser } from 'foldkit'

export const capturedKeyDownStream = <Message>(
  toMessage: (key: string) => Message,
): Stream.Stream<Message> =>
  Browser.streamFromEventFilterMapPreventDefault({
    target: document,
    type: 'keydown',
    filterMapEvent: keyboardEvent => Option.some(toMessage(keyboardEvent.key)),
  })
