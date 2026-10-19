import { Option } from 'effect'
import { Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  PressedEscape: {},
})

const escapePresses = Dom.streamFromEventFilterMap({
  target: document,
  type: 'keydown',
  filterMapEvent: event =>
    event.key === 'Escape'
      ? Option.some(Message.PressedEscape())
      : Option.none(),
})
