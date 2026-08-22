import { Array, Crypto, Effect, Match as M, Schema as S } from 'effect'
import { Calendar, Command, Update } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { BrowserCrypto } from '@effect/platform-browser'

import * as Entry from './entry'

// MODEL

export const Model = S.Struct({
  entries: S.Array(Entry.Model),
  today: Calendar.CalendarDate,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateEntryId: { entryId: S.String },
  FailedGenerateEntryId: {},
  RemovedEntry: { entryId: S.String },
  GotEntryMessage: {
    entryId: S.String,
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

export const GenerateEntryId = Command.define('GenerateEntryId', {
  messages: [Message.SucceededGenerateEntryId, Message.FailedGenerateEntryId],
  execute: Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto
    const entryId = yield* crypto.randomUUIDv4
    return Message.SucceededGenerateEntryId({ entryId })
  }).pipe(
    Effect.provide(BrowserCrypto.layer),
    Effect.catch(() => Effect.succeed(Message.FailedGenerateEntryId())),
  ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const foldEntryOutMessage: (
  entryId: string,
) => (outMessage: Entry.OutMessage) => Update.Step<Model, Message> = entryId =>
  M.type<Entry.OutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Removed: () => model => ({
        model: evo(model, {
          entries: Array.filter(entry => entry.id !== entryId),
        }),
      }),
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
    toParentMessage: message => Message.GotEntryMessage({ entryId, message }),
    foldOutMessage: foldEntryOutMessage(entryId),
  })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedAddEntry: () => ({ model, commands: [GenerateEntryId()] }),

    SucceededGenerateEntryId: ({ entryId }) => ({
      model: evo(model, {
        entries: Array.append(Entry.init(entryId, model.today)),
      }),
    }),

    FailedGenerateEntryId: () => ({ model }),

    RemovedEntry: ({ entryId }) => ({
      model: evo(model, {
        entries: Array.filter(entry => entry.id !== entryId),
      }),
    }),

    GotEntryMessage: ({ entryId, message }) =>
      foldEntry(entryId)(model, message),
  })

// VALIDATION SUMMARY

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, Entry.isComplete)

export const revealErrors = (model: Model): Model =>
  evo(model, { entries: Array.map(Entry.revealErrors) })
