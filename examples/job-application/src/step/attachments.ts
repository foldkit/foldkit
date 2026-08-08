import { Array, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command, File, Update } from 'foldkit'
import { m } from 'foldkit/message'
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

export const GotResumeDropMessage = m('GotResumeDropMessage', {
  message: FileDrop.Message,
})
export const GotAdditionalFilesDropMessage = m(
  'GotAdditionalFilesDropMessage',
  { message: FileDrop.Message },
)
export const RemovedResume = m('RemovedResume')
export const RemovedAdditionalFile = m('RemovedAdditionalFile', {
  fileIndex: S.Number,
})

export const Message = S.Union([
  GotResumeDropMessage,
  GotAdditionalFilesDropMessage,
  RemovedResume,
  RemovedAdditionalFile,
])
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  resumeDrop: FileDrop.init({ id: 'attachments-resume' }),
  maybeResume: Option.none(),
  additionalFilesDrop: FileDrop.init({ id: 'attachments-additional' }),
  additionalFiles: [],
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const foldResumeDrop = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.resumeDrop),
  write: (model, nextResumeDrop) =>
    evo(model, { resumeDrop: () => nextResumeDrop }),
  toParentMessage: message => GotResumeDropMessage({ message }),
  foldOutMessage: M.type<FileDrop.OutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      ReceivedFiles:
        ({ files }) =>
        model => [
          evo(model, {
            maybeResume: () =>
              pipe(
                files,
                Array.head,
                Option.orElse(() => model.maybeResume),
              ),
          }),
          [],
        ],
      RejectedNonFiles: () => model => [model, []],
    }),
  ),
})

const foldAdditionalFilesDrop = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.additionalFilesDrop),
  write: (model, nextAdditionalFilesDrop) =>
    evo(model, { additionalFilesDrop: () => nextAdditionalFilesDrop }),
  toParentMessage: message => GotAdditionalFilesDropMessage({ message }),
  foldOutMessage: M.type<FileDrop.OutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      ReceivedFiles:
        ({ files }) =>
        model => [
          evo(model, {
            additionalFiles: Array.appendAll(files),
          }),
          [],
        ],
      RejectedNonFiles: () => model => [model, []],
    }),
  ),
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotResumeDropMessage: ({ message }) => foldResumeDrop(message)(model),

      GotAdditionalFilesDropMessage: ({ message }) =>
        foldAdditionalFilesDrop(message)(model),

      RemovedResume: () => [
        evo(model, { maybeResume: () => Option.none() }),
        [],
      ],

      RemovedAdditionalFile: ({ fileIndex }) => [
        evo(model, {
          additionalFiles: Array.remove(fileIndex),
        }),
        [],
      ],
    }),
  )
