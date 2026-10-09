import { Array, Crypto, Effect, Schema } from 'effect'
import { Calendar, Command, Update } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

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
  SucceededGenerateWorkHistoryEntryId: { entryId: Schema.String },
  FailedGenerateWorkHistoryEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  GotEntryMessage: {
    entryId: Schema.String,
    message: Entry.Message,
  },
})

export type Message = typeof Message.Type

// INIT

export const init = (today: CalendarDate, initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId, today)],
  today,
})

// COMMAND

export const GenerateWorkHistoryEntryId = Command.define(
  'GenerateWorkHistoryEntryId',
  {
    messages: [
      Message.SucceededGenerateWorkHistoryEntryId,
      Message.FailedGenerateWorkHistoryEntryId,
    ],
  },
)

export const GenerateWorkHistoryEntryIdLive =
  GenerateWorkHistoryEntryId.toLayer(() =>
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const entryId = yield* crypto.randomUUIDv4
      return Message.SucceededGenerateWorkHistoryEntryId({ entryId })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(Message.FailedGenerateWorkHistoryEntryId()),
      ),
    ),
  )

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

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedAddEntry: () => ({
      model,
      commands: [GenerateWorkHistoryEntryId()],
    }),

    SucceededGenerateWorkHistoryEntryId: ({ entryId }) => ({
      model: modifyFields(model, {
        entries: Array.append(Entry.init(entryId, model.today)),
      }),
    }),

    FailedGenerateWorkHistoryEntryId: () => ({ model }),

    RemovedEntry: ({ entryId }) => ({
      model: modifyFields(model, {
        entries: Array.filter(entry => entry.id !== entryId),
      }),
    }),

    GotEntryMessage: ({ entryId, message }) =>
      foldEntry(model, entryId, message),
  }),
)

// VALIDATION SUMMARY

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, Entry.isComplete)

export const revealErrors = (model: Model): Model =>
  modifyFields(model, { entries: Array.map(Entry.revealErrors) })
