import { Option } from 'effect'
import { Dom } from 'foldkit'

import { Message } from './message'

export const searchShortcut = Dom.streamFromEventFilterMap({
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
