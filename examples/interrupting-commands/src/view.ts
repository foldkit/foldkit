import clsx from 'clsx'
import { Array, Match } from 'effect'
import { Html } from 'foldkit/html'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
} from './composition'
import { Message } from './message'
import { type Upload, type UploadStatus } from './model'

const badgeClass = (status: UploadStatus): string =>
  Match.value(status).pipe(
    Match.when('Uploading', () => 'bg-blue-100 text-blue-700'),
    Match.when('Done', () => 'bg-green-100 text-green-700'),
    Match.when('Cancelled', () => 'bg-gray-200 text-gray-600'),
    Match.exhaustive,
  )

const ACTION_BUTTON_CLASS =
  'px-3 py-1 text-sm font-medium rounded-md border transition'

const uploadActionView = (upload: Upload, h: ApplicationViewBuilder): Html =>
  Match.value(upload.status).pipe(
    Match.when('Uploading', () =>
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
    Match.when('Cancelled', () =>
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
    Match.when('Done', () => h.empty),
    Match.exhaustive,
  )

const uploadView = (upload: Upload, h: ApplicationViewBuilder): Html =>
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

export const view = ApplicationComposition.makeView((model, h) => {
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
})
