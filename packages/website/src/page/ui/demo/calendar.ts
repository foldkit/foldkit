import type { HtmlBuilder } from 'foldkit/html'

import { Calendar } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'
import { calendarView } from './calendarView'

// DEMO CONTENT

const containerClassName =
  'inline-flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm select-none min-w-[304px] min-h-[324px]'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  return [
    h.submodel({
      slotId: model.calendarBasicDemo.id,
      model: model.calendarBasicDemo,
      view: Calendar.view,
      viewInputs: {
        maybeSelectedDate: model.maybeCalendarBasicDemoSelectedDate,
        toView: calendarView(containerClassName, h),
      },
      toParentMessage: message =>
        Message.GotCalendarBasicDemoMessage({ message }),
    }),
  ]
}
