import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as File from '../../file/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const Model = S.Struct({
  maybeResume: S.Option(File.File),
  maybePreviewDataUrl: S.Option(S.String),
  readStatus: S.Literals(['Idle', 'Reading', 'Failed']),
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedChooseResume: {},
  CompletedSelectResume: { file: File.File },
  CancelledSelectResume: {},
  SucceededReadPreview: { dataUrl: S.String },
  FailedReadPreview: {},
  ClickedRemoveResume: {},
})

export type Message = typeof Message.Type

// COMMAND

export const SelectResume = Command.define('SelectResume', {
  messages: [Message.CompletedSelectResume, Message.CancelledSelectResume],
  execute: File.select(['application/pdf']).pipe(
    Effect.map(
      Option.match({
        onNone: () => Message.CancelledSelectResume(),
        onSome: file => Message.CompletedSelectResume({ file }),
      }),
    ),
  ),
})

export const ReadResumePreview = Command.define('ReadResumePreview', {
  args: { file: File.File },
  messages: [Message.SucceededReadPreview, Message.FailedReadPreview],
  execute: ({ file }) =>
    File.readAsDataUrl(file).pipe(
      Effect.map(dataUrl => Message.SucceededReadPreview({ dataUrl })),
      Effect.catch(() => Effect.succeed(Message.FailedReadPreview())),
    ),
})

// INIT

export const initialModel: Model = {
  maybeResume: Option.none(),
  maybePreviewDataUrl: Option.none(),
  readStatus: 'Idle',
}

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedChooseResume: () => ({ model, commands: [SelectResume()] }),
    CompletedSelectResume: ({ file }) => ({
      model: evo(model, {
        maybeResume: () => Option.some(file),
        maybePreviewDataUrl: () => Option.none(),
        readStatus: () => 'Reading',
      }),
      commands: [ReadResumePreview({ file })],
    }),
    CancelledSelectResume: () => ({ model }),
    SucceededReadPreview: ({ dataUrl }) => ({
      model: evo(model, {
        maybePreviewDataUrl: () => Option.some(dataUrl),
        readStatus: () => 'Idle',
      }),
    }),
    FailedReadPreview: () => ({
      model: evo(model, { readStatus: () => 'Failed' }),
    }),
    ClickedRemoveResume: () => ({
      model: evo(model, {
        maybeResume: () => Option.none(),
        maybePreviewDataUrl: () => Option.none(),
        readStatus: () => 'Idle',
      }),
    }),
  })

// VIEW

const previewView = (model: Model, h: HtmlBuilder<Message>): Html => {
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

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Class('resume-upload')],
    [
      Option.match(model.maybeResume, {
        onNone: () =>
          h.button(
            [h.OnClick(Message.ClickedChooseResume())],
            ['Choose resume'],
          ),
        onSome: file =>
          h.section(
            [h.AriaLabel('Selected resume')],
            [
              h.p([h.Class('resume-name')], [File.name(file)]),
              previewView(model, h),
              h.button([h.OnClick(Message.ClickedRemoveResume())], ['Remove']),
            ],
          ),
      }),
    ],
  )
}
