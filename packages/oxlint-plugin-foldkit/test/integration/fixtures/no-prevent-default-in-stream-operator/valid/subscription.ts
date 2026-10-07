import { Option } from 'effect'
import { Browser } from 'foldkit'

import { Message } from './message'

export const keyboard = Browser.streamFromEventFilterMapPreventDefault({
  target: document,
  type: 'keydown',
  filterMapEvent: keyboardEvent =>
    Option.some(Message.PressedKey({ key: keyboardEvent.key })),
})
