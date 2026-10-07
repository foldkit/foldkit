import { Option } from 'effect'
import { Dom } from 'foldkit'

import { Message } from './message'

export const keyboard = Dom.fromEventFilterMapPreventDefault({
  target: document,
  type: 'keydown',
  filterMapEvent: keyboardEvent =>
    Option.some(Message.PressedKey({ key: keyboardEvent.key })),
})
