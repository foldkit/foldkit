import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

import { DatePicker } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/popover'

import { Icon } from '../../../icon'
import { Message } from '../message'
import type { Model } from '../model'
import { calendarView } from './calendarView'

// DEMO CONTENT

const triggerClassName =
  'demo-neutral-button inline-flex min-w-48 items-center justify-between gap-2'

const triggerContentClassName = 'flex w-full items-center justify-between gap-4'

const placeholderClassName = 'text-gray-500 dark:text-gray-400'

const panelClassName =
  'demo-popup-surface rounded-xl bg-white p-4 dark:border-gray-800 dark:bg-gray-950'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const calendarWrapperClassName =
  'flex flex-col gap-3 select-none min-w-[268px] min-h-[284px]'

// VIEW

const DATE_PICKER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const formatTriggerLabel = (
  date: Readonly<{ year: number; month: number; day: number }>,
) =>
  `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  const triggerContent = (
    maybeDate: Option.Option<
      Readonly<{ year: number; month: number; day: number }>
    >,
  ) =>
    h.div(
      [h.Class(triggerContentClassName)],
      [
        Option.match(maybeDate, {
          onNone: () =>
            h.span([h.Class(placeholderClassName)], ['Pick a date']),
          onSome: date => h.span([], [formatTriggerLabel(date)]),
        }),
        Icon.chevronDown('w-4 h-4'),
      ],
    )

  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [
            h.For(DatePicker.triggerId(model.datePickerBasicDemo.id)),
            h.Class('demo-label'),
          ],
          ['Due date'],
        ),
        h.submodel({
          slotId: model.datePickerBasicDemo.id,
          model: model.datePickerBasicDemo,
          view: DatePicker.view,
          viewInputs: {
            anchor: DATE_PICKER_ANCHOR,
            maybeSelectedDate: model.maybeDatePickerBasicDemoSelectedDate,
            triggerContent,
            triggerClassName,
            panelClassName,
            backdropClassName,
            className: wrapperClassName,
            toCalendarView: calendarView(calendarWrapperClassName, h),
          },
          toParentMessage: message =>
            Message.GotDatePickerBasicDemoMessage({ message }),
        }),
      ],
    ),
  ]
}
