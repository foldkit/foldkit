import { Array, Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import * as File from '../../file'
import { type Html, html } from '../../html'
import { m } from '../../message'

// MODEL

export const Model = S.Struct({
  maybeResume: S.OptionFromSelf(File.File),
  maybePreviewDataUrl: S.OptionFromSelf(S.String),
  readStatus: S.Literal('Idle', 'Reading', 'Failed'),
})

export type Model = typeof Model.Type

// MESSAGE

export const ClickedChooseResume = m('ClickedChooseResume')
export const SelectedResume = m('SelectedResume', {
  files: S.Array(File.File),
})
export const CancelledSelectResume = m('CancelledSelectResume')
export const SucceededReadPreview = m('SucceededReadPreview', {
  dataUrl: S.String,
})
export const FailedReadPreview = m('FailedReadPreview')
export const ClickedRemoveResume = m('ClickedRemoveResume')

export const Message = S.Union(
  ClickedChooseResume,
  SelectedResume,
  CancelledSelectResume,
  SucceededReadPreview,
  FailedReadPreview,
  ClickedRemoveResume,
)
export type Message = typeof Message.Type

// COMMAND

export const SelectResume = Command.define(
  'SelectResume',
  SelectedResume,
  CancelledSelectResume,
)

export const ReadResumePreview = Command.define(
  'ReadResumePreview',
  SucceededReadPreview,
  FailedReadPreview,
)

const selectResume = SelectResume(
  File.select(['application/pdf']).pipe(
    Effect.map(files =>
      Array.isNonEmptyReadonlyArray(files)
        ? SelectedResume({ files })
        : CancelledSelectResume(),
    ),
  ),
)

const readResumePreview = (file: File.File) =>
  ReadResumePreview(
    File.readAsDataUrl(file).pipe(
      Effect.map(dataUrl => SucceededReadPreview({ dataUrl })),
      Effect.catchAll(() => Effect.succeed(FailedReadPreview())),
    ),
  )

// INIT

export const initialModel: Model = {
  maybeResume: Option.none(),
  maybePreviewDataUrl: Option.none(),
  readStatus: 'Idle',
}

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedChooseResume: () => [model, [selectResume]],
      SelectedResume: ({ files }) =>
        Option.match(Array.head(files), {
          onNone: (): UpdateReturn => [model, []],
          onSome: firstFile => [
            {
              ...model,
              maybeResume: Option.some(firstFile),
              maybePreviewDataUrl: Option.none(),
              readStatus: 'Reading',
            },
            [readResumePreview(firstFile)],
          ],
        }),
      CancelledSelectResume: () => [model, []],
      SucceededReadPreview: ({ dataUrl }) => [
        {
          ...model,
          maybePreviewDataUrl: Option.some(dataUrl),
          readStatus: 'Idle',
        },
        [],
      ],
      FailedReadPreview: () => [{ ...model, readStatus: 'Failed' }, []],
      ClickedRemoveResume: () => [
        {
          ...model,
          maybeResume: Option.none(),
          maybePreviewDataUrl: Option.none(),
          readStatus: 'Idle',
        },
        [],
      ],
    }),
  )

// VIEW

const {
  div,
  p,
  img,
  button,
  empty,
  Alt,
  AriaLabel,
  Class,
  OnClick,
  Role,
  Src,
} = html<Message>()

const previewView = (model: Model): Html =>
  Option.match(model.maybePreviewDataUrl, {
    onSome: dataUrl => img([Src(dataUrl), Alt('Resume preview')]),
    onNone: () =>
      M.value(model.readStatus).pipe(
        M.withReturnType<Html>(),
        M.when('Reading', () => p([Role('status')], ['Reading preview...'])),
        M.when('Failed', () => p([Role('alert')], ['Could not read preview'])),
        M.when('Idle', () => empty),
        M.exhaustive,
      ),
  })

export const view = (model: Model): Html =>
  div(
    [Class('resume-upload')],
    [
      Option.match(model.maybeResume, {
        onNone: () =>
          button(
            [OnClick(ClickedChooseResume()), AriaLabel('Choose resume')],
            ['Choose resume'],
          ),
        onSome: file =>
          div(
            [Role('region'), AriaLabel('Selected resume')],
            [
              p([Class('resume-name')], [File.name(file)]),
              previewView(model),
              button(
                [OnClick(ClickedRemoveResume()), AriaLabel('Remove resume')],
                ['Remove'],
              ),
            ],
          ),
      }),
    ],
  )
