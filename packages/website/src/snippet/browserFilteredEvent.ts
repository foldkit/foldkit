import { Option } from 'effect'
import { Browser } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  PressedEscape: {},
})

const escapePresses = Browser.streamFromEventFilterMap({
  target: document,
  type: 'keydown',
  filterMapEvent: event =>
    event.key === 'Escape'
      ? Option.some(Message.PressedEscape())
      : Option.none(),
})
