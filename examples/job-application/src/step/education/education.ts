import { Array, Effect, Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { Calendar, Command, Update } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { BrowserCrypto } from '@effect/platform-browser'

import * as Entry from './entry'

// MODEL

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.Model),
  today: Calendar.CalendarDate,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  CompletedGenerateEntryId: { entryId: Schema.String },
  RemovedEntry: { entryId: Schema.String },
  GotEntryMessage: {
    entryId: Schema.String,
    message: Entry.Message,
  },
})

export type Message = typeof Message.Type

// INIT

export const init = (today: CalendarDate, initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId)],
  today,
})

// COMMAND

export const GenerateEntryId = Command.define('GenerateEntryId', {
  messages: [Message.CompletedGenerateEntryId],
  execute: Effect.gen(function* () {
    const secureRandom = yield* SecureRandom.SecureRandom
    const entryId = yield* secureRandom.uuidV4()
    return Message.CompletedGenerateEntryId({ entryId })
  }).pipe(Effect.provide(BrowserCrypto.layerSecureRandom)),
})

// UPDATE

const foldEntryOutMessage = (entryId: string) =>
  Entry.OutMessage.match<Update.Step<Model, Message>>({
    Removed: () => model => ({
      model: modifyFields(model, {
        entries: Array.filter(entry => entry.id !== entryId),
      }),
    }),
  })

const foldEntry = Update.foldChildAt({
  update: Entry.update,
  readAt: (model: Model, entryId: string) =>
    Array.findFirst(model.entries, entry => entry.id === entryId),
  writeAt: (model, entryId, nextEntry) =>
    modifyFields(model, {
      entries: Array.map(entry => (entry.id === entryId ? nextEntry : entry)),
    }),
  toParentMessage: (entryId, message) =>
    Message.GotEntryMessage({ entryId, message }),
  foldOutMessage: foldEntryOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedAddEntry: () => ({ model, commands: [GenerateEntryId()] }),

    CompletedGenerateEntryId: ({ entryId }) => ({
      model: modifyFields(model, {
        entries: Array.append(Entry.init(entryId)),
      }),
    }),

    RemovedEntry: ({ entryId }) => ({
      model: modifyFields(model, {
        entries: Array.filter(entry => entry.id !== entryId),
      }),
    }),

    GotEntryMessage: ({ entryId, message }) =>
      foldEntry(model, entryId, message),
  })

// VALIDATION SUMMARY

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, Entry.isComplete)

export const revealErrors = (model: Model): Model =>
  modifyFields(model, { entries: Array.map(Entry.revealErrors) })
