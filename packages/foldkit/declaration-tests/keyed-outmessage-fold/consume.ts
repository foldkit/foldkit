import type {
  ExactAcquiredRequirements,
  ExactFoldRequirements,
  ExactHandlerServices,
  ExactLayerRequirements,
} from './accepted.js'
import { EquivalentEntriesBinding, foldForEntry } from './accepted.js'
import { ChildBlock, ChildOutMessage } from './child.js'
import { EntryId, Model, ParentBlock, foldSelection } from './parent.js'

export type Contracts = readonly [
  ExactAcquiredRequirements,
  ExactFoldRequirements,
  ExactHandlerServices,
  ExactLayerRequirements,
]

export const entries = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'entries',
}).withOutMessagePolicy({ fold: foldSelection })
export const curriedEntries = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'entries',
}).withOutMessagePolicy({ fold: foldForEntry })
export const inlineEntries = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'entries',
}).withOutMessagePolicy({
  fold: key =>
    ParentBlock.makeOutMessageFold(ChildBlock, {
      Selected: ({ value }) =>
        ParentBlock.makeFieldsStep(() => ({
          selected: () => value,
          selectedId: () => key,
        })),
      Closed: ParentBlock.makeNoopStep,
    }),
})
export const equivalentEntries = EquivalentEntriesBinding

declare const model: Model
// @ts-expect-error Emission preserves the required FoldContext.
foldSelection(ChildOutMessage.Selected({ value: 'Pear' }))
// @ts-expect-error Emission preserves the branded occurrence key.
foldForEntry('first')
// @ts-expect-error The extracted relationship still requires its registered graph.
entries.requestChoose(EntryId.make('first'), { value: 'Pear' })(model)
