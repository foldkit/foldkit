import * as Counter from '../../counter'
import { EditorBlock, makeBinding, makeComposition } from '../block'
import { FocusEditor } from '../mount'
import { DialogBinding } from './dialog'

export const CounterBinding = makeBinding(Counter.CounterBlock, {
  field: 'counter',
})

export const EditorComposition = makeComposition({
  bindings: [CounterBinding, DialogBinding],
  mounts: [FocusEditor],
})
