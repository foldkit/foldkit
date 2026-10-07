import { Option } from 'effect'
import { Browser } from 'foldkit'

import { Message } from './message'

export const searchShortcut = Browser.streamFromEventFilterMap({
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
