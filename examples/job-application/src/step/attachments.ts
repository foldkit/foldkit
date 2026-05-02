import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command, File, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  resumeDrop: Ui.FileDrop.Model,
  maybeResume: S.Option(File.File),
  additionalFilesDrop: Ui.FileDrop.Model,
  additionalFiles: S.Array(File.File),
})
export type Model = typeof Model.Type

// MESSAGE

export const GotResumeDropMessage = m('GotResumeDropMessage', {
  message: Ui.FileDrop.Message,
})
export const GotAdditionalFilesDropMessage = m(
  'GotAdditionalFilesDropMessage',
  { message: Ui.FileDrop.Message },
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
  resumeDrop: Ui.FileDrop.init({ id: 'attachments-resume' }),
  maybeResume: Option.none(),
  additionalFilesDrop: Ui.FileDrop.init({ id: 'attachments-additional' }),
  additionalFiles: [],
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotResumeDropMessage: ({ message: dropMessage }) => {
        const [nextDrop, commands, maybeOutMessage] = Ui.FileDrop.update(
          model.resumeDrop,
          dropMessage,
        )

        const nextMaybeResume = Option.match(maybeOutMessage, {
          onNone: () => model.maybeResume,
          onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
            M.tagsExhaustive({
              ReceivedFiles: ({ files }) =>
                pipe(
                  files,
                  Array.head,
                  Option.orElse(() => model.maybeResume),
                ),
              DroppedWithoutFiles: () => model.maybeResume,
            }),
          ),
        })

        return [
          evo(model, {
            resumeDrop: () => nextDrop,
            maybeResume: () => nextMaybeResume,
          }),
          Array.map(
            commands,
            Command.mapEffect(
              Effect.map(message => GotResumeDropMessage({ message })),
            ),
          ),
        ]
      },

      GotAdditionalFilesDropMessage: ({ message: dropMessage }) => {
        const [nextDrop, commands, maybeOutMessage] = Ui.FileDrop.update(
          model.additionalFilesDrop,
          dropMessage,
        )

        const nextAdditionalFiles = Option.match(maybeOutMessage, {
          onNone: () => model.additionalFiles,
          onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
            M.tagsExhaustive({
              ReceivedFiles: ({ files }) => [
                ...model.additionalFiles,
                ...files,
              ],
              DroppedWithoutFiles: () => model.additionalFiles,
            }),
          ),
        })

        return [
          evo(model, {
            additionalFilesDrop: () => nextDrop,
            additionalFiles: () => nextAdditionalFiles,
          }),
          Array.map(
            commands,
            Command.mapEffect(
              Effect.map(message => GotAdditionalFilesDropMessage({ message })),
            ),
          ),
        ]
      },

      RemovedResume: () => [
        evo(model, { maybeResume: () => Option.none() }),
        [],
      ],

      RemovedAdditionalFile: ({ fileIndex }) => [
        evo(model, {
          additionalFiles: () => Array.remove(model.additionalFiles, fileIndex),
        }),
        [],
      ],
    }),
  )
