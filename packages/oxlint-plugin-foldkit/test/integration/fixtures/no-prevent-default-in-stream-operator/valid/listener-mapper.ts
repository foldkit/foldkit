import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'

export const searchShortcut = Subscription.fromEventFilterMap<
  KeyboardEvent,
  Message
>({
  target: window,
  type: 'keydown',
  toMessage: event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      return Option.some(Message.OpenedSearch())
    }
    return Option.none()
  },
})
