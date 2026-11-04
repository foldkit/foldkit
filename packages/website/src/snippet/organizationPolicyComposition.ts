import * as Counter from '../../counter'
import { EditorBlock } from '../definition'
import { FocusEditor } from '../mount'
import { DialogBinding } from './dialog'

export const CounterBinding = EditorBlock.makeBinding(Counter.CounterBlock, {
  field: 'counter',
})

export const EditorComposition = EditorBlock.makeComposition({
  bindings: [CounterBinding, DialogBinding],
  mounts: [FocusEditor],
})
