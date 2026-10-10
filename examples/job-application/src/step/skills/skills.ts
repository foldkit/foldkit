import { Array, Crypto, Effect, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Entry from './entry'

// MODEL

export const Model = Schema.Struct({
  entries: Schema.Array(Entry.Model),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedAddEntry: {},
  SucceededGenerateSkillsEntryId: { entryId: Schema.String },
  FailedGenerateSkillsEntryId: {},
  RemovedEntry: { entryId: Schema.String },
  GotEntryMessage: {
    entryId: Schema.String,
    message: Entry.Message,
  },
})

export type Message = typeof Message.Type

// INIT

export const init = (initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId)],
})

// COMMAND

export const GenerateSkillsEntryId = Command.define(
  'GenerateSkillsEntryId',
  {
    messages: [
      Message.SucceededGenerateSkillsEntryId,
      Message.FailedGenerateSkillsEntryId,
    ],
  },
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto

    return () =>
      crypto.randomUUIDv4.pipe(
        Effect.map(entryId =>
          Message.SucceededGenerateSkillsEntryId({ entryId }),
        ),
        Effect.catch(() =>
          Effect.succeed(Message.FailedGenerateSkillsEntryId()),
        ),
      )
  }),
)

export const EffectsLayer = GenerateSkillsEntryId.layer

// UPDATE

const foldEntryOutMessage =
  (entryId: string) => (outMessage: typeof Entry.OutMessage.Type) =>
    Entry.OutMessage.match(outMessage, {
      Removed: () =>
        Update.makeStep((model: Model) => ({
          model: modifyFields(model, {
            entries: Array.filter(entry => entry.id !== entryId),
          }),
        })),
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
    ClickedAddEntry: () => ({ model, commands: [GenerateSkillsEntryId()] }),

    SucceededGenerateSkillsEntryId: ({ entryId }) => ({
      model: modifyFields(model, {
        entries: Array.append(Entry.init(entryId)),
      }),
    }),

    FailedGenerateSkillsEntryId: () => ({ model }),

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
