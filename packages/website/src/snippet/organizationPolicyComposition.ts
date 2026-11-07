import * as Counter from '../../counter'
import {
  EditorBlock,
  makeRequiredFieldBinding,
  makeComposition,
} from '../block'
import { FocusEditor } from '../mount'
import { DialogBinding } from './dialog'

export const CounterBinding = makeRequiredFieldBinding(Counter.CounterBlock, {
  field: 'counter',
})

export const EditorComposition = makeComposition({
  bindings: [CounterBinding, DialogBinding],
  mounts: [FocusEditor],
})
