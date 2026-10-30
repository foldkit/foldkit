import { Effect, Layer, Match, Option, Schema } from 'effect'
import { Block, Calendar as FoldkitCalendar } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Calendar } from '@foldkit/ui'
import type {
  CalendarAttributes,
  DaysModeAttributes,
  MonthsModeAttributes,
  Week,
  YearsModeAttributes,
} from '@foldkit/ui/calendar'

import * as Icon from '../domain/icon'

const Model = Schema.Struct({
  calendarBasicDemo: Calendar.Calendar,
  maybeCalendarBasicDemoSelectedDate: Schema.Option(
    FoldkitCalendar.CalendarDate,
  ),
})
type Model = typeof Model.Type

export class CalendarPage extends Block<
  CalendarPage,
  Readonly<{ today: CalendarDate }>
>()('CalendarPage', { Model }) {}

const containerClassName =
  'inline-flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm select-none min-w-[304px] min-h-[324px]'

const headerClassName = 'flex items-center justify-between gap-2'

const headingButtonClassName =
  'inline-flex items-center gap-2 text-sm font-semibold text-gray-900 tabular-nums px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100'

const headingTextClassName = 'text-sm font-semibold text-gray-900 tabular-nums'

const navButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer'

const gridClassName = 'flex flex-col gap-1 outline-none'

const rowClassName = 'grid grid-cols-7 gap-1'

const columnHeaderClassName =
  'text-center text-xs font-medium uppercase tracking-wide text-gray-500 py-1'

const cellClassName = 'group flex items-center justify-center'

const dayButtonClassName =
  'flex h-9 w-9 items-center justify-center rounded-full text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-accent-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-accent-500 group-data-[outside-month]:text-gray-400 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

const monthYearGridClassName =
  'grid grid-cols-3 grid-rows-4 gap-1 outline-none flex-1'

const monthYearButtonClassName =
  'flex h-full w-full items-center justify-center rounded-md text-sm text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 group-data-[today]:ring-1 group-data-[today]:ring-gray-400 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white! group-data-[selected]:hover:bg-accent-600 group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-accent-500 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40'

// PIECES

const navButton = (
  attributes: ReadonlyArray<ChildAttribute>,
  icon: Html,
  h: HtmlBuilder<never>,
): Html => h.button([...attributes, h.Class(navButtonClassName)], [icon])

const headingButton = (
  heading: DaysModeAttributes['heading'],
  attributes: ReadonlyArray<ChildAttribute>,
  h: HtmlBuilder<never>,
): Html =>
  h.button(
    [h.Id(heading.id), ...attributes, h.Class(headingButtonClassName)],
    [heading.text, Icon.chevronDown('w-3 h-3')],
  )

const weekRow = (week: Week, h: HtmlBuilder<never>) =>
  h.div(
    [...week.attributes, h.Class(rowClassName)],
    week.cells.map(cell =>
      h.div(
        [...cell.cellAttributes, h.Class(cellClassName)],
        [
          h.button(
            [...cell.buttonAttributes, h.Class(dayButtonClassName)],
            [cell.label],
          ),
        ],
      ),
    ),
  )

// MODES

const daysView = (days: DaysModeAttributes, h: HtmlBuilder<never>) =>
  h.div(
    [...days.root, h.Class(containerClassName)],
    [
      h.div(
        [h.Class(headerClassName)],
        [
          navButton(days.previousMonthButton, Icon.chevronLeft('w-5 h-5'), h),
          headingButton(days.heading, days.headingButton, h),
          navButton(days.nextMonthButton, Icon.chevronRight('w-5 h-5'), h),
        ],
      ),
      h.div(
        [...days.grid, h.Class(gridClassName)],
        [
          h.div(
            [...days.headerRow, h.Class(rowClassName)],
            days.columnHeaders.map(header =>
              h.div(
                [...header.attributes, h.Class(columnHeaderClassName)],
                [header.name],
              ),
            ),
          ),
          ...days.weeks.map(week => weekRow(week, h)),
        ],
      ),
    ],
  )

const monthsView = (months: MonthsModeAttributes, h: HtmlBuilder<never>) =>
  h.div(
    [...months.root, h.Class(containerClassName)],
    [
      h.div(
        [h.Class(`${headerClassName} justify-center`)],
        [headingButton(months.heading, months.headingButton, h)],
      ),
      h.div(
        [...months.grid, h.Class(monthYearGridClassName)],
        months.cells.map(cell =>
          h.div(
            [...cell.cellAttributes, h.Class(cellClassName)],
            [
              h.button(
                [...cell.buttonAttributes, h.Class(monthYearButtonClassName)],
                [cell.shortLabel],
              ),
            ],
          ),
        ),
      ),
    ],
  )

const yearsView = (years: YearsModeAttributes, h: HtmlBuilder<never>) =>
  h.div(
    [...years.root, h.Class(containerClassName)],
    [
      h.div(
        [h.Class(headerClassName)],
        [
          navButton(years.previousPageButton, Icon.chevronLeft('w-5 h-5'), h),
          h.h2(
            [h.Id(years.heading.id), h.Class(headingTextClassName)],
            [years.heading.text],
          ),
          navButton(years.nextPageButton, Icon.chevronRight('w-5 h-5'), h),
        ],
      ),
      h.div(
        [...years.grid, h.Class(monthYearGridClassName)],
        years.cells.map(cell =>
          h.div(
            [...cell.cellAttributes, h.Class(cellClassName)],
            [
              h.button(
                [...cell.buttonAttributes, h.Class(monthYearButtonClassName)],
                [cell.label],
              ),
            ],
          ),
        ),
      ),
    ],
  )

const view = (model: Model, h: HtmlBuilder<never>): Html => {
  const calendarView = Match.type<CalendarAttributes>().pipe(
    Match.tagsExhaustive({
      Days: days => daysView(days, h),
      Months: months => monthsView(months, h),
      Years: years => yearsView(years, h),
    }),
  )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Calendar']),
      model.calendarBasicDemo.view({
        maybeSelectedDate: model.maybeCalendarBasicDemoSelectedDate,
        toView: calendarView,
      }),
    ],
  )
}

export const CalendarPageLive = CalendarPage.make(
  Effect.fn(function* (_id, { today }) {
    const calendarBasicDemo = yield* new Calendar.Calendar(
      'calendarBasicDemo',
      {
        id: 'calendar-basic-demo',
        today,
        minDate: FoldkitCalendar.subtractYears(today, 1),
        maxDate: FoldkitCalendar.addYears(today, 1),
      },
    )

    return {
      model: {
        calendarBasicDemo,
        maybeCalendarBasicDemoSelectedDate: Option.none(),
      },

      update: {
        ...calendarBasicDemo.on({
          SelectedDate: (model, { date }) => ({
            model: modifyFields(model, {
              maybeCalendarBasicDemoSelectedDate: () => Option.some(date),
            }),
          }),
          ChangedViewMonth: model => ({ model }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(Calendar.CalendarLive))
