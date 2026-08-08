import { Array, Crypto, Effect, Match as M, Schema as S } from 'effect'
import { Command, Update } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { BrowserCrypto } from '@effect/platform-browser'

import * as Entry from './entry'

// MODEL

export const Model = S.Struct({
  entries: S.Array(Entry.Model),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedAddEntry = m('ClickedAddEntry')
export const SucceededGenerateEntryId = m('SucceededGenerateEntryId', {
  entryId: S.String,
})
export const FailedGenerateEntryId = m('FailedGenerateEntryId')
export const RemovedEntry = m('RemovedEntry', { entryId: S.String })
export const GotEntryMessage = m('GotEntryMessage', {
  entryId: S.String,
  message: Entry.Message,
})

export const Message = S.Union([
  ClickedAddEntry,
  SucceededGenerateEntryId,
  FailedGenerateEntryId,
  RemovedEntry,
  GotEntryMessage,
])
export type Message = typeof Message.Type

// INIT

export const init = (initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId)],
})

// COMMAND

export const GenerateEntryId = Command.define('GenerateEntryId', {
  messages: [SucceededGenerateEntryId, FailedGenerateEntryId],
  execute: Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto
    const entryId = yield* crypto.randomUUIDv4
    return SucceededGenerateEntryId({ entryId })
  }).pipe(
    Effect.provide(BrowserCrypto.layer),
    Effect.catch(() => Effect.succeed(FailedGenerateEntryId())),
  ),
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const foldEntryOutMessage: (
  entryId: string,
) => (outMessage: Entry.OutMessage) => Update.Step<Model, Message> = entryId =>
  M.type<Entry.OutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Removed: () => model => [
        evo(model, {
          entries: Array.filter(entry => entry.id !== entryId),
        }),
        [],
      ],
    }),
  )

const foldEntry = (entryId: string) =>
  Update.foldChild({
    update: Entry.update,
    read: (model: Model) =>
      Array.findFirst(model.entries, entry => entry.id === entryId),
    write: (model, nextEntry) =>
      evo(model, {
        entries: Array.map(entry => (entry.id === entryId ? nextEntry : entry)),
      }),
    toParentMessage: message => GotEntryMessage({ entryId, message }),
    foldOutMessage: foldEntryOutMessage(entryId),
  })

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedAddEntry: () => [model, [GenerateEntryId()]],

      SucceededGenerateEntryId: ({ entryId }) => [
        evo(model, {
          entries: Array.append(Entry.init(entryId)),
        }),
        [],
      ],

      FailedGenerateEntryId: () => [model, []],

      RemovedEntry: ({ entryId }) => [
        evo(model, {
          entries: Array.filter(entry => entry.id !== entryId),
        }),
        [],
      ],

      GotEntryMessage: ({ entryId, message }) =>
        foldEntry(entryId)(message)(model),
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, Entry.isComplete)

export const revealErrors = (model: Model): Model =>
  evo(model, { entries: Array.map(Entry.revealErrors) })
