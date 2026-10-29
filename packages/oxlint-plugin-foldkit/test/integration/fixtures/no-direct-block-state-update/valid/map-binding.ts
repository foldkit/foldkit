import { HashMap, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as KeyedEntry from './keyedEntry'

const WrappedEntry = Schema.Struct({
  child: KeyedEntry.Model,
  label: Schema.String,
})
type WrappedEntry = typeof WrappedEntry.Type
const Model = Schema.Struct({
  entriesById: Schema.HashMap(Schema.String, KeyedEntry.Model),
  wrappedEntriesById: Schema.HashMap(Schema.String, WrappedEntry),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedApplyTheme: {} })
const ApplicationDefinition = Block.makeDefinition('MapApplication', {
  Model,
  Message,
})
const { makeMapBinding: bindMap } = ApplicationDefinition
const EntriesBinding = ApplicationDefinition.makeMapBinding(
  KeyedEntry.KeyedEntryBlock,
  { field: 'entriesById' },
)
const WrappedEntriesBinding = bindMap(
  KeyedEntry.KeyedEntryBlock,
  {
    field: 'wrappedEntriesById',
    childField: 'child',
  },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EntriesBinding, WrappedEntriesBinding],
})

export const initial: Model = Model.make({
  entriesById: HashMap.empty(),
  wrappedEntriesById: HashMap.empty(),
})

export const update = ApplicationComposition.makeUpdate({
  ClickedApplyTheme: EntriesBinding.informThemeChanged('initial', {
    theme: 'Light',
  }),
})

export const updateWrapperMetadata = ApplicationComposition.makeUpdate({
  ClickedApplyTheme: model => ({
    model: modifyFields(model, {
      wrappedEntriesById: wrappedEntriesById =>
        HashMap.modify(wrappedEntriesById, 'initial', wrapper =>
          modifyFields(wrapper, { label: () => 'Current' }),
        ),
    }),
  }),
})

export const updateWrapperMetadataDataLast =
  ApplicationComposition.makeUpdate({
    ClickedApplyTheme: model => ({
      model: modifyFields(model, {
        wrappedEntriesById: wrappedEntriesById =>
          HashMap.modify<string, WrappedEntry>(
            'initial',
            wrapper => modifyFields(wrapper, { label: () => 'Current' }),
          )(wrappedEntriesById),
      }),
    }),
  })

export const updateWrapperMetadataInPipe =
  ApplicationComposition.makeUpdate({
    ClickedApplyTheme: model => ({
      model: modifyFields(model, {
        wrappedEntriesById: wrappedEntriesById =>
          pipe(
            wrappedEntriesById,
            HashMap.modify<string, WrappedEntry>(
              'initial',
              wrapper => modifyFields(wrapper, { label: () => 'Current' }),
            ),
            HashMap.modify<string, WrappedEntry>('initial', wrapper =>
              modifyFields(wrapper, { label: () => 'Selected' }),
            ),
          ),
      }),
    }),
  })
