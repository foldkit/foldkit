import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Meter } from '@foldkit/ui'

import type { Message as UiMessage } from '../message'
import type { UiModel } from '../model'

const rowClassName = 'flex flex-col gap-2 w-full max-w-sm'
const headerClassName = 'flex items-center justify-between text-sm'
const labelClassName = 'font-medium text-gray-900'
const valueClassName = 'tabular-nums text-gray-600'
const trackClassName = 'h-3 w-full overflow-hidden rounded-full bg-gray-200'
const fillClassName = 'h-full rounded-full bg-emerald-600'

export const view = Submodel.defineView<UiModel, UiMessage>(
  (_model, h): Html => {
    const healthMeterView = ({
      meter,
      label,
      fill,
    }: Meter.MeterAttributes<UiMessage>): Html =>
      h.div(
        [h.Class(rowClassName)],
        [
          h.div(
            [h.Class(headerClassName)],
            [
              h.span([...label, h.Class(labelClassName)], ['Health']),
              h.span([h.Class(valueClassName)], ['75 / 100']),
            ],
          ),
          h.div(
            [...meter, h.Class(trackClassName)],
            [h.div([...fill, h.Class(fillClassName)])],
          ),
        ],
      )

    const storageMeterView = ({
      meter,
      label,
      fill,
    }: Meter.MeterAttributes<UiMessage>): Html =>
      h.div(
        [h.Class(rowClassName)],
        [
          h.div(
            [h.Class(headerClassName)],
            [
              h.span([...label, h.Class(labelClassName)], ['Storage']),
              h.span([h.Class(valueClassName)], ['82%']),
            ],
          ),
          h.div(
            [...meter, h.Class(trackClassName)],
            [h.div([...fill, h.Class('h-full rounded-full bg-amber-500')])],
          ),
        ],
      )

    return h.div(
      [],
      [
        h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Meter']),
        h.h3(
          [h.Class('text-lg font-semibold text-gray-900 mb-4')],
          ['Scalar value'],
        ),
        Meter.view(
          {
            id: 'health-meter',
            value: 75,
            valueText: '75 of 100 health',
            toView: healthMeterView,
          },
          h,
        ),
        h.h3(
          [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
          ['Thresholds'],
        ),
        Meter.view(
          {
            id: 'storage-meter',
            value: 82,
            low: 30,
            high: 80,
            optimum: 20,
            valueText: '82 percent used',
            toView: storageMeterView,
          },
          h,
        ),
      ],
    )
  },
)
