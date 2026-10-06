import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Progress } from '@foldkit/ui'

import type { Message as UiMessage } from '../message'
import type { UiModel } from '../model'

const rowClassName = 'flex flex-col gap-2 w-full max-w-sm'
const headerClassName = 'flex items-center justify-between text-sm'
const labelClassName = 'font-medium text-gray-900'
const valueClassName = 'tabular-nums text-gray-600'
const trackClassName = 'h-3 w-full overflow-hidden rounded-full bg-gray-200'
const indicatorClassName = 'h-full rounded-full bg-accent-600'

export const view = Submodel.defineView<UiModel, UiMessage>(
  (_model, h): Html => {
    const uploadProgressView = ({
      progress,
      label,
      track,
      indicator,
    }: Progress.ProgressAttributes<UiMessage>): Html =>
      h.div(
        [h.Class(rowClassName)],
        [
          h.div(
            [h.Class(headerClassName)],
            [
              h.span([...label, h.Class(labelClassName)], ['Upload']),
              h.span([h.Class(valueClassName)], ['42%']),
            ],
          ),
          h.div(
            [...progress, h.Class(trackClassName)],
            [
              h.div(
                [...track, h.Class('h-full w-full')],
                [h.div([...indicator, h.Class(indicatorClassName)])],
              ),
            ],
          ),
        ],
      )

    const syncingProgressView = ({
      progress,
      label,
      indicator,
    }: Progress.ProgressAttributes<UiMessage>): Html =>
      h.div(
        [h.Class(rowClassName)],
        [
          h.span([...label, h.Class(labelClassName)], ['Syncing']),
          h.div(
            [...progress, h.Class(trackClassName)],
            [
              h.div([
                ...indicator,
                h.Class(`${indicatorClassName} w-1/3 animate-pulse`),
              ]),
            ],
          ),
        ],
      )

    return h.div(
      [],
      [
        h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Progress']),
        h.h3(
          [h.Class('text-lg font-semibold text-gray-900 mb-4')],
          ['Determinate'],
        ),
        Progress.view(
          {
            id: 'upload-progress',
            value: 42,
            valueText: '42 percent',
            toView: uploadProgressView,
          },
          h,
        ),
        h.h3(
          [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
          ['Indeterminate'],
        ),
        Progress.view(
          {
            id: 'sync-progress',
            valueText: 'Syncing files',
            toView: syncingProgressView,
          },
          h,
        ),
      ],
    )
  },
)
