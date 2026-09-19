import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'

export const searchShortcut = Subscription.fromEventFilterMap({
  target: window,
  type: 'keydown',
  filterMapEvent: event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      return Option.some(Message.OpenedSearch())
    }
    return Option.none()
  },
})
