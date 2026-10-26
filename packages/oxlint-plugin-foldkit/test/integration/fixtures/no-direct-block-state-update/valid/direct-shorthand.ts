import { Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as BoundSettings from './boundSettings'
import * as KeyedEntry from './keyedEntry'

const Model = Schema.Struct({
  entries: Schema.Array(KeyedEntry.Model),
  maybeSettings: Schema.Option(BoundSettings.Model),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ClickedApplyThemes: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const EntriesBinding = ApplicationDefinition.makeBinding(KeyedEntry.KeyedEntryBlock, {
  field: 'entries',
  key: 'id',
})
const MaybeSettingsBinding = ApplicationDefinition.makeBinding(
  BoundSettings.BoundSettingsBlock,
  { field: 'maybeSettings' },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EntriesBinding, MaybeSettingsBinding],
})

export const initial: Model = Model.make({
  entries: [],
  maybeSettings: Option.none(),
})

export const updateWithNamedOperations = ApplicationComposition.makeUpdate({
  ClickedApplyThemes: model =>
    Update.combineSteps(model, [
      EntriesBinding.informThemeChanged('initial', { theme: 'Light' }),
      MaybeSettingsBinding.informThemeChanged({ theme: 'Dark' }),
    ]),
})
