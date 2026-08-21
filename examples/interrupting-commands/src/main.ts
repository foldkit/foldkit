import clsx from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Option,
  Schema as S,
  pipe,
} from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const UploadStatus = S.Literals(['Uploading', 'Done', 'Cancelled'])
export type UploadStatus = typeof UploadStatus.Type

export const Upload = S.Struct({
  id: S.Number,
  fileName: S.String,
  sizeMegabytes: S.Number,
  status: UploadStatus,
})
export type Upload = typeof Upload.Type

export const Model = S.Struct({
  uploadId: S.Number,
  uploads: S.Array(Upload),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedStartUpload: {},
  ClickedCancelUpload: { uploadId: S.Number },
  ClickedCancelAllUploads: {},
  ClickedRestartUpload: { uploadId: S.Number },
  SucceededUploadFile: { uploadId: S.Number },
  CompletedCancelUploadFile: {
    uploadId: S.Number,
    outcome: Command.Interruptible.Outcome,
  },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  uploadId: 0,
  uploads: [],
}

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: initialModel,
})

// FAKE FILES

export const FakeFile = S.Struct({ name: S.String, sizeMegabytes: S.Number })
export type FakeFile = typeof FakeFile.Type

export const FAKE_FILES: Array.NonEmptyReadonlyArray<FakeFile> = [
  { name: 'vacation-photos.zip', sizeMegabytes: 48 },
  { name: 'demo-recording.mp4', sizeMegabytes: 87 },
  { name: 'quarterly-report.pdf', sizeMegabytes: 12 },
  { name: 'design-assets.sketch', sizeMegabytes: 34 },
  { name: 'database-backup.sql', sizeMegabytes: 61 },
]

const fakeFileForUpload = (uploadId: number): FakeFile =>
  pipe(
    FAKE_FILES,
    Array.get(uploadId % Array.length(FAKE_FILES)),
    Option.getOrElse(() => Array.headNonEmpty(FAKE_FILES)),
  )

// COMMAND

const MILLISECONDS_PER_MEGABYTE = 100

export const UploadKey = S.Struct({ uploadId: S.Number })
export type UploadKey = typeof UploadKey.Type

export const UploadFile = Command.define('UploadFile', {
  args: { ...UploadKey.fields, sizeMegabytes: S.Number },
  messages: [Message.SucceededUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => String(uploadId),
  },
  execute: ({ uploadId, sizeMegabytes }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(
        Duration.millis(sizeMegabytes * MILLISECONDS_PER_MEGABYTE),
      )
      return Message.SucceededUploadFile({ uploadId })
    }),
})

export const CancelUploadFile = ({ uploadId }: UploadKey) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFile({ uploadId, outcome }),
  )

// UPDATE

const setStatusForId = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId ? evo(upload, { status: () => status }) : upload,
  )

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedStartUpload: () => {
      const fakeFile = fakeFileForUpload(model.uploadId)
      const startedUpload = Upload.make({
        id: model.uploadId,
        fileName: fakeFile.name,
        sizeMegabytes: fakeFile.sizeMegabytes,
        status: 'Uploading',
      })
      return {
        model: evo(model, {
          uploadId: Number.increment,
          uploads: Array.append(startedUpload),
        }),
        commands: [
          UploadFile({
            uploadId: startedUpload.id,
            sizeMegabytes: startedUpload.sizeMegabytes,
          }),
        ],
      }
    },

    ClickedCancelUpload: ({ uploadId }) => ({
      model,
      commands: [CancelUploadFile({ uploadId })],
    }),

    ClickedCancelAllUploads: () => {
      const commands = pipe(
        model.uploads,
        Array.filter(upload => upload.status === 'Uploading'),
        Array.map(upload => CancelUploadFile({ uploadId: upload.id })),
      )
      return Array.match(commands, {
        onEmpty: () => ({ model }),
        onNonEmpty: commands => ({ model, commands }),
      })
    },

    ClickedRestartUpload: ({ uploadId }) =>
      pipe(
        model.uploads,
        Array.findFirst(
          upload => upload.id === uploadId && upload.status === 'Cancelled',
        ),
        Option.match({
          onNone: () => ({ model }),
          onSome: upload => ({
            model: evo(model, {
              uploads: setStatusForId(uploadId, 'Uploading'),
            }),
            commands: [
              UploadFile({ uploadId, sizeMegabytes: upload.sizeMegabytes }),
            ],
          }),
        }),
      ),

    SucceededUploadFile: ({ uploadId }) => ({
      model: evo(model, { uploads: setStatusForId(uploadId, 'Done') }),
    }),

    CompletedCancelUploadFile: ({ uploadId, outcome }) =>
      M.value(outcome).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
          Interrupted: () => ({
            model: evo(model, {
              uploads: setStatusForId(uploadId, 'Cancelled'),
            }),
          }),
          NotFound: () => ({ model }),
        }),
      ),
  })

// VIEW

const badgeClass = (status: UploadStatus): string =>
  M.value(status).pipe(
    M.when('Uploading', () => 'bg-blue-100 text-blue-700'),
    M.when('Done', () => 'bg-green-100 text-green-700'),
    M.when('Cancelled', () => 'bg-gray-200 text-gray-600'),
    M.exhaustive,
  )

const ACTION_BUTTON_CLASS =
  'px-3 py-1 text-sm font-medium rounded-md border transition'

const uploadActionView = (upload: Upload, h: HtmlBuilder<Message>): Html =>
  M.value(upload.status).pipe(
    M.when('Uploading', () =>
      h.keyed('button')(
        'Uploading',
        [
          h.OnClick(Message.ClickedCancelUpload({ uploadId: upload.id })),
          h.AriaLabel(`Cancel upload ${upload.id}`),
          h.Class(
            clsx(
              ACTION_BUTTON_CLASS,
              'border-red-300 text-red-600 hover:bg-red-50',
            ),
          ),
        ],
        ['Cancel'],
      ),
    ),
    M.when('Cancelled', () =>
      h.keyed('button')(
        'Cancelled',
        [
          h.OnClick(Message.ClickedRestartUpload({ uploadId: upload.id })),
          h.AriaLabel(`Restart upload ${upload.id}`),
          h.Class(
            clsx(
              ACTION_BUTTON_CLASS,
              'border-blue-300 text-blue-600 hover:bg-blue-50',
            ),
          ),
        ],
        ['Restart'],
      ),
    ),
    M.when('Done', () => h.empty),
    M.exhaustive,
  )

const uploadView = (upload: Upload, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    String(upload.id),
    [h.Class('p-4 bg-white rounded-lg shadow flex flex-col gap-2')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-3')],
        [
          h.div(
            [h.Class('flex items-baseline gap-2 min-w-0')],
            [
              h.span(
                [h.Class('font-medium text-gray-800 truncate')],
                [upload.fileName],
              ),
              h.span(
                [h.Class('text-sm text-gray-500 shrink-0')],
                [`${upload.sizeMegabytes} MB`],
              ),
            ],
          ),
          h.div(
            [h.Class('flex items-center gap-3 shrink-0')],
            [
              h.span(
                [
                  h.Class(
                    clsx(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      badgeClass(upload.status),
                    ),
                  ),
                ],
                [upload.status],
              ),
              uploadActionView(upload, h),
            ],
          ),
        ],
      ),
      upload.status === 'Uploading'
        ? h.div([h.Class('h-1.5 rounded-full bg-blue-400 animate-pulse')])
        : h.empty,
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const isAnyUploadRunning = Array.some(
    model.uploads,
    upload => upload.status === 'Uploading',
  )

  const body = h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-lg mx-auto flex flex-col gap-6 px-4')],
        [
          h.h1(
            [h.Class('text-3xl font-bold text-gray-800 text-center')],
            ['File Uploads'],
          ),
          h.div(
            [h.Class('flex justify-center gap-3')],
            [
              h.button(
                [
                  h.OnClick(Message.ClickedStartUpload()),
                  h.Class(
                    'px-4 py-2 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 transition',
                  ),
                ],
                ['Upload a file'],
              ),
              isAnyUploadRunning
                ? h.keyed('button')(
                    'CancelAll',
                    [
                      h.OnClick(Message.ClickedCancelAllUploads()),
                      h.Class(
                        'px-4 py-2 rounded-md border border-red-300 text-red-600 font-medium hover:bg-red-50 transition',
                      ),
                    ],
                    ['Cancel all'],
                  )
                : h.empty,
            ],
          ),
          Array.match(model.uploads, {
            onEmpty: () =>
              h.keyed('p')(
                'NoUploads',
                [h.Class('text-center text-gray-500')],
                ['Nothing here yet. Start an upload.'],
              ),
            onNonEmpty: uploads =>
              h.keyed('ul')(
                'UploadList',
                [h.Class('flex flex-col gap-3')],
                Array.map(uploads, upload => uploadView(upload, h)),
              ),
          }),
        ],
      ),
    ],
  )

  return { title: 'Foldkit Interrupting Commands Example', body }
}
