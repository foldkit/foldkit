import { Option } from 'effect'
import { Dom } from 'foldkit'

import { Message } from './message'

export const keyboard = Dom.streamFromEventFilterMapPreventDefault({
  target: document,
  type: 'keydown',
  filterMapEvent: keyboardEvent =>
    Option.some(Message.PressedKey({ key: keyboardEvent.key })),
})
