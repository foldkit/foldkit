import { Array, Match as M, Option, Schema as S, pipe } from 'effect'
import { File, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { FileDrop } from '@foldkit/ui'

// MODEL

export const Model = S.Struct({
  resumeDrop: FileDrop.Model,
  maybeResume: S.Option(File.File),
  additionalFilesDrop: FileDrop.Model,
  additionalFiles: S.Array(File.File),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotResumeDropMessage: { message: FileDrop.Message },
  GotAdditionalFilesDropMessage: { message: FileDrop.Message },
  RemovedResume: {},
  RemovedAdditionalFile: { fileIndex: S.Number },
})

export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  resumeDrop: FileDrop.init({ id: 'attachments-resume' }),
  maybeResume: Option.none(),
  additionalFilesDrop: FileDrop.init({ id: 'attachments-additional' }),
  additionalFiles: [],
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const foldResumeDropOutMessage = M.type<FileDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ReceivedFiles:
      ({ files }) =>
      model => ({
        model: evo(model, {
          maybeResume: () =>
            pipe(
              files,
              Array.head,
              Option.orElse(() => model.maybeResume),
            ),
        }),
      }),
    RejectedNonFiles: () => model => ({ model }),
  }),
)

const foldResumeDrop = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.resumeDrop),
  write: (model, nextResumeDrop) =>
    evo(model, { resumeDrop: () => nextResumeDrop }),
  toParentMessage: message => Message.GotResumeDropMessage({ message }),
  foldOutMessage: foldResumeDropOutMessage,
})

const foldAdditionalFilesDropOutMessage = M.type<FileDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ReceivedFiles:
      ({ files }) =>
      model => ({
        model: evo(model, {
          additionalFiles: Array.appendAll(files),
        }),
      }),
    RejectedNonFiles: () => model => ({ model }),
  }),
)

const foldAdditionalFilesDrop = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.additionalFilesDrop),
  write: (model, nextAdditionalFilesDrop) =>
    evo(model, { additionalFilesDrop: () => nextAdditionalFilesDrop }),
  toParentMessage: message =>
    Message.GotAdditionalFilesDropMessage({ message }),
  foldOutMessage: foldAdditionalFilesDropOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotResumeDropMessage: ({ message }) => foldResumeDrop(model, message),

    GotAdditionalFilesDropMessage: ({ message }) =>
      foldAdditionalFilesDrop(model, message),

    RemovedResume: () => ({
      model: evo(model, { maybeResume: () => Option.none() }),
    }),

    RemovedAdditionalFile: ({ fileIndex }) => ({
      model: evo(model, {
        additionalFiles: Array.remove(fileIndex),
      }),
    }),
  })
