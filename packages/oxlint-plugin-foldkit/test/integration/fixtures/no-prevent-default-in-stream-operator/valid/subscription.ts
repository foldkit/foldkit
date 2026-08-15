import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'

export const keyboard = Subscription.fromEventPreventDefault<
  KeyboardEvent,
  Message
>({
  target: document,
  type: 'keydown',
  toMessage: keyboardEvent =>
    Option.some(Message.PressedKey({ key: keyboardEvent.key })),
})
