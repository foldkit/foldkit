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
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
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

export const ClickedStartUpload = m('ClickedStartUpload')
export const ClickedCancelUpload = m('ClickedCancelUpload', {
  uploadId: S.Number,
})
export const ClickedCancelAllUploads = m('ClickedCancelAllUploads')
export const ClickedRestartUpload = m('ClickedRestartUpload', {
  uploadId: S.Number,
})
export const SucceededUploadFile = m('SucceededUploadFile', {
  uploadId: S.Number,
})
export const CompletedCancelUploadFile = m('CompletedCancelUploadFile', {
  uploadId: S.Number,
  outcome: Command.Interruptible.Outcome,
})

export const Message = S.Union([
  ClickedStartUpload,
  ClickedCancelUpload,
  ClickedCancelAllUploads,
  ClickedRestartUpload,
  SucceededUploadFile,
  CompletedCancelUploadFile,
])
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  uploadId: 0,
  uploads: [],
}

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  initialModel,
  [],
]

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

export const UploadFile = Command.Interruptible.define(
  'UploadFile',
  { ...UploadKey.fields, sizeMegabytes: S.Number },
  ({ uploadId }: UploadKey) => String(uploadId),
  SucceededUploadFile,
)(({ uploadId, sizeMegabytes }) =>
  Effect.gen(function* () {
    yield* Effect.sleep(
      Duration.millis(sizeMegabytes * MILLISECONDS_PER_MEGABYTE),
    )
    return SucceededUploadFile({ uploadId })
  }),
)

export const CancelUploadFile = ({ uploadId }: UploadKey) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    CompletedCancelUploadFile({ uploadId, outcome }),
  )

// UPDATE

const setStatusForId = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId ? evo(upload, { status: () => status }) : upload,
  )

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedStartUpload: () => {
        const fakeFile = fakeFileForUpload(model.uploadId)
        const startedUpload = Upload.make({
          id: model.uploadId,
          fileName: fakeFile.name,
          sizeMegabytes: fakeFile.sizeMegabytes,
          status: 'Uploading',
        })
        return [
          evo(model, {
            uploadId: Number.increment,
            uploads: Array.append(startedUpload),
          }),
          [
            UploadFile({
              uploadId: startedUpload.id,
              sizeMegabytes: startedUpload.sizeMegabytes,
            }),
          ],
        ]
      },

      ClickedCancelUpload: ({ uploadId }) => [
        model,
        [CancelUploadFile({ uploadId })],
      ],

      ClickedCancelAllUploads: () => [
        model,
        pipe(
          model.uploads,
          Array.filter(upload => upload.status === 'Uploading'),
          Array.map(upload => CancelUploadFile({ uploadId: upload.id })),
        ),
      ],

      ClickedRestartUpload: ({ uploadId }) =>
        pipe(
          model.uploads,
          Array.findFirst(
            upload => upload.id === uploadId && upload.status === 'Cancelled',
          ),
          Option.match({
            onNone: () => [model, []],
            onSome: upload => [
              evo(model, { uploads: setStatusForId(uploadId, 'Uploading') }),
              [UploadFile({ uploadId, sizeMegabytes: upload.sizeMegabytes })],
            ],
          }),
        ),

      SucceededUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusForId(uploadId, 'Done') }),
        [],
      ],

      CompletedCancelUploadFile: ({ uploadId, outcome }) =>
        M.value(outcome).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
          M.tagsExhaustive({
            Interrupted: () => [
              evo(model, { uploads: setStatusForId(uploadId, 'Cancelled') }),
              [],
            ],
            NotFound: () => [model, []],
          }),
        ),
    }),
  )

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

const uploadActionView = (upload: Upload): Html => {
  const h = html<Message>()

  return M.value(upload.status).pipe(
    M.when('Uploading', () =>
      h.keyed('button')(
        'Uploading',
        [
          h.OnClick(ClickedCancelUpload({ uploadId: upload.id })),
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
          h.OnClick(ClickedRestartUpload({ uploadId: upload.id })),
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
}

const uploadView = (upload: Upload): Html => {
  const h = html<Message>()

  return h.keyed('li')(
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
              uploadActionView(upload),
            ],
          ),
        ],
      ),
      upload.status === 'Uploading'
        ? h.div([h.Class('h-1.5 rounded-full bg-blue-400 animate-pulse')], [])
        : h.empty,
    ],
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

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
                  h.OnClick(ClickedStartUpload()),
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
                      h.OnClick(ClickedCancelAllUploads()),
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
                Array.map(uploads, uploadView),
              ),
          }),
        ],
      ),
    ],
  )

  return { title: 'Foldkit Interrupting Commands Example', body }
}
