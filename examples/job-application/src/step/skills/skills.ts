import {
  Array,
  Effect,
  Match as M,
  Option,
  Random,
  Schema as S,
  pipe,
} from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import * as Entry from './entry'

// MODEL

export const Model = S.Struct({
  entries: S.Array(Entry.Model),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedAddEntry = m('ClickedAddEntry')
export const AddedEntry = m('AddedEntry', { entryId: S.String })
export const RemovedEntry = m('RemovedEntry', { entryId: S.String })
export const GotEntryMessage = m('GotEntryMessage', {
  entryId: S.String,
  message: Entry.Message,
})

export const Message = S.Union([
  ClickedAddEntry,
  AddedEntry,
  RemovedEntry,
  GotEntryMessage,
])
export type Message = typeof Message.Type

// INIT

export const init = (initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId)],
})

// COMMAND

export const AddEntry = Command.define(
  'AddEntry',
  AddedEntry,
)(Random.nextUUIDv4.pipe(Effect.map(entryId => AddedEntry({ entryId }))))

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const mapEntryCommands = (
  entryId: string,
  commands: ReadonlyArray<Command.Command<Entry.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands, message =>
    GotEntryMessage({ entryId, message }),
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedAddEntry: () => [model, [AddEntry()]],

      AddedEntry: ({ entryId }) => [
        evo(model, {
          entries: Array.append(Entry.init(entryId)),
        }),
        [],
      ],

      RemovedEntry: ({ entryId }) => [
        evo(model, {
          entries: Array.filter(entry => entry.id !== entryId),
        }),
        [],
      ],

      GotEntryMessage: ({ entryId, message: entryMessage }) =>
        pipe(
          model.entries,
          Array.findFirst(entry => entry.id === entryId),
          Option.match({
            onNone: (): UpdateReturn => [model, []],
            onSome: matchedEntry => {
              const [nextEntry, entryCommands, maybeOutMessage] = Entry.update(
                matchedEntry,
                entryMessage,
              )
              const mappedCommands = mapEntryCommands(entryId, entryCommands)
              const modelWithEntry = evo(model, {
                entries: Array.map(entry =>
                  entry.id === entryId ? nextEntry : entry,
                ),
              })
              return Option.match(maybeOutMessage, {
                onNone: (): UpdateReturn => [modelWithEntry, mappedCommands],
                onSome: M.type<Entry.OutMessage>().pipe(
                  M.withReturnType<UpdateReturn>(),
                  M.tagsExhaustive({
                    Removed: () => [
                      evo(modelWithEntry, {
                        entries: Array.filter(entry => entry.id !== entryId),
                      }),
                      mappedCommands,
                    ],
                  }),
                ),
              })
            },
          }),
        ),
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, Entry.isComplete)
