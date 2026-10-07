import { Option } from 'effect'
import { Browser } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  PressedSearchShortcut: {},
})

const searchShortcuts = Browser.streamFromEventFilterMapPreventDefault({
  target: document,
  type: 'keydown',
  filterMapEvent: event =>
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      ? Option.some(Message.PressedSearchShortcut())
      : Option.none(),
})
