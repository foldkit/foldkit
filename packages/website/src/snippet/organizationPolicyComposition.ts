import * as Counter from '../../counter'
import { Editor } from '../definition'
import { Message } from '../message'
import { FocusEditor } from '../mount'
import { DialogBinding } from './dialog'

export const CounterBinding = Editor.bindChild(Counter.block, {
  field: 'counter',
  parentMessage: Message.GotCounterMessage,
})

export const EditorComposition = Editor.makeComposition({
  childBindings: [CounterBinding, DialogBinding],
  mounts: [FocusEditor],
})
