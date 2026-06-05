import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as File from '../../file/index.js'
import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const Model = S.Struct({
  maybeResume: S.Option(File.File),
  maybePreviewDataUrl: S.Option(S.String),
  readStatus: S.Literals(['Idle', 'Reading', 'Failed']),
})

export type Model = typeof Model.Type

// MESSAGE

export const ClickedChooseResume = m('ClickedChooseResume')
export const SelectedResume = m('SelectedResume', {
  file: File.File,
})
export const CancelledSelectResume = m('CancelledSelectResume')
export const SucceededReadPreview = m('SucceededReadPreview', {
  dataUrl: S.String,
})
export const FailedReadPreview = m('FailedReadPreview')
export const ClickedRemoveResume = m('ClickedRemoveResume')

export const Message = S.Union([
  ClickedChooseResume,
  SelectedResume,
  CancelledSelectResume,
  SucceededReadPreview,
  FailedReadPreview,
  ClickedRemoveResume,
])
export type Message = typeof Message.Type

// COMMAND

export const SelectResume = Command.define(
  'SelectResume',
  SelectedResume,
  CancelledSelectResume,
)(
  File.select(['application/pdf']).pipe(
    Effect.map(
      Option.match({
        onNone: () => CancelledSelectResume(),
        onSome: file => SelectedResume({ file }),
      }),
    ),
  ),
)

export const ReadResumePreview = Command.define(
  'ReadResumePreview',
  { file: File.File },
  SucceededReadPreview,
  FailedReadPreview,
)(({ file }) =>
  File.readAsDataUrl(file).pipe(
    Effect.map(dataUrl => SucceededReadPreview({ dataUrl })),
    Effect.catch(() => Effect.succeed(FailedReadPreview())),
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
      ClickedChooseResume: () => [model, [SelectResume()]],
      SelectedResume: ({ file }) => [
        evo(model, {
          maybeResume: () => Option.some(file),
          maybePreviewDataUrl: () => Option.none(),
          readStatus: () => 'Reading',
        }),
        [ReadResumePreview({ file })],
      ],
      CancelledSelectResume: () => [model, []],
      SucceededReadPreview: ({ dataUrl }) => [
        evo(model, {
          maybePreviewDataUrl: () => Option.some(dataUrl),
          readStatus: () => 'Idle',
        }),
        [],
      ],
      FailedReadPreview: () => [evo(model, { readStatus: () => 'Failed' }), []],
      ClickedRemoveResume: () => [
        evo(model, {
          maybeResume: () => Option.none(),
          maybePreviewDataUrl: () => Option.none(),
          readStatus: () => 'Idle',
        }),
        [],
      ],
    }),
  )

// VIEW

const previewView = (model: Model): Html => {
  const h = html<Message>()

  return Option.match(model.maybePreviewDataUrl, {
    onSome: dataUrl => h.img([h.Src(dataUrl), h.Alt('Resume preview')]),
    onNone: () =>
      M.value(model.readStatus).pipe(
        M.withReturnType<Html>(),
        M.when('Reading', () =>
          h.keyed('p')('reading', [h.Role('status')], ['Reading preview...']),
        ),
        M.when('Failed', () =>
          h.keyed('p')('failed', [h.Role('alert')], ['Could not read preview']),
        ),
        M.when('Idle', () => h.empty),
        M.exhaustive,
      ),
  })
}

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('resume-upload')],
    [
      Option.match(model.maybeResume, {
        onNone: () =>
          h.button([h.OnClick(ClickedChooseResume())], ['Choose resume']),
        onSome: file =>
          h.section(
            [h.AriaLabel('Selected resume')],
            [
              h.p([h.Class('resume-name')], [File.name(file)]),
              previewView(model),
              h.button([h.OnClick(ClickedRemoveResume())], ['Remove']),
            ],
          ),
      }),
    ],
  )
}
