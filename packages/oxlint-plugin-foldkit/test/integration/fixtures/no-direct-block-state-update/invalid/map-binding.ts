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
const Message = defineMessageUnion({ ClickedUpdateEntryManually: {} })
const ApplicationDefinition = Block.makeDefinition('MapApplication', {
  Model,
  Message,
})
const { makeMapBinding: bindMap } = ApplicationDefinition
const EntriesBinding = ApplicationDefinition.makeMapBinding(KeyedEntry.Entry, {
  field: 'entriesById',
})
const WrappedEntriesBinding = bindMap(
  KeyedEntry.Entry,
  {
    field: 'wrappedEntriesById',
    childField: 'child',
  },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EntriesBinding, WrappedEntriesBinding],
})

export const updateEntryManually = ApplicationComposition.makeUpdate({
  ClickedUpdateEntryManually: model => ({
    model: modifyFields(model, {
      entriesById: entriesById =>
        HashMap.modify(entriesById, 'initial', entry =>
          modifyFields(entry, { theme: () => 'Dark' }),
        ),
    }),
  }),
})

export const updateEntryWithAppliedDataLast =
  ApplicationComposition.makeUpdate({
    ClickedUpdateEntryManually: model => ({
      model: modifyFields(model, {
        entriesById: entriesById =>
          HashMap.modify<string, typeof KeyedEntry.Model.Type>(
            'initial',
            entry => modifyFields(entry, { theme: () => 'Dark' }),
          )(entriesById),
      }),
    }),
  })

export const updateEntryInPipe = ApplicationComposition.makeUpdate({
  ClickedUpdateEntryManually: model => ({
    model: modifyFields(model, {
      entriesById: entriesById =>
        pipe(
          entriesById,
          HashMap.modify<string, typeof KeyedEntry.Model.Type>(
            'initial',
            entry => modifyFields(entry, { theme: () => 'Dark' }),
          ),
          entries => entries,
        ),
    }),
  }),
})

export const updateWrappedChild = ApplicationComposition.makeUpdate({
  ClickedUpdateEntryManually: model => ({
    model: modifyFields(model, {
      wrappedEntriesById: wrappedEntriesById =>
        HashMap.modify(wrappedEntriesById, 'initial', wrapper =>
          modifyFields(wrapper, {
            child: child =>
              modifyFields(child, { theme: () => 'Dark' }),
          }),
        ),
    }),
  }),
})

export const updateWrappedChildAfterMetadata =
  ApplicationComposition.makeUpdate({
    ClickedUpdateEntryManually: model => ({
      model: modifyFields(model, {
        wrappedEntriesById: wrappedEntriesById =>
          pipe(
            wrappedEntriesById,
            HashMap.modify<string, WrappedEntry>(
              'initial',
              wrapper => modifyFields(wrapper, { label: () => 'Current' }),
            ),
            HashMap.modify<string, WrappedEntry>('initial', wrapper =>
              modifyFields(wrapper, {
                child: child =>
                  modifyFields(child, { theme: () => 'Dark' }),
              }),
            ),
          ),
      }),
    }),
  })
