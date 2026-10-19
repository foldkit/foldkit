import { Option } from 'effect'
import { Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  PressedSearchShortcut: {},
})

const searchShortcuts = Dom.streamFromEventFilterMapPreventDefault({
  target: document,
  type: 'keydown',
  filterMapEvent: event =>
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      ? Option.some(Message.PressedSearchShortcut())
      : Option.none(),
})
