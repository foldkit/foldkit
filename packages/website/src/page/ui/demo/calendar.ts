import type { UiViewBuilder } from '../composition'
import { CalendarBasicDemoBinding } from '../composition'
import type { Model } from '../model'
import { calendarView } from './calendarView'

// DEMO CONTENT

const containerClassName =
  'inline-flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shadow-sm select-none min-w-[304px] min-h-[324px]'

export const basicDemo = (model: Model, h: UiViewBuilder) => {
  return [
    h.block(
      CalendarBasicDemoBinding.embedView({
        slotId: model.calendarBasicDemo.id,
        model: model.calendarBasicDemo,
        viewInputs: {
          maybeSelectedDate: model.maybeCalendarBasicDemoSelectedDate,
          toView: calendarView(containerClassName, h),
        },
      }),
    ),
  ]
}
