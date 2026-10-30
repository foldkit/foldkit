import { Effect, Layer, Match, Option, Schema } from 'effect'
import { Block, Calendar } from 'foldkit'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { DatePicker } from '@foldkit/ui'
import type {
  CalendarAttributes as UiCalendarCalendarAttributes,
  DaysModeAttributes as UiCalendarDaysModeAttributes,
  MonthsModeAttributes as UiCalendarMonthsModeAttributes,
  Week as UiCalendarWeek,
  YearsModeAttributes as UiCalendarYearsModeAttributes,
} from '@foldkit/ui/calendar'
import { triggerId as DatePickerTriggerId } from '@foldkit/ui/datePicker'

// Read `today` once at the app boundary, for example through Flags, and pass
// it in as constructor args so the constructor stays pure
export const flags = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today }
})

type DatePickerExampleArgs = Readonly<{ today: Calendar.CalendarDate }>

// The parent owns the selected date and passes it back in as
// `maybeSelectedDate`
export class DatePickerExample extends Block<
  DatePickerExample,
  DatePickerExampleArgs
>()('DatePickerExample', {
  Model: Schema.Struct({
    datePickerDemo: DatePicker.DatePicker,
    maybeSelectedDate: Schema.Option(Calendar.CalendarDate),
  }),
}) {}

type DatePickerExampleViewBuilder = HtmlBuilder<never>

// Class names live at module scope, and each view mode gets its own view
// function below. The calendar panel has no border of its own: the
// DatePicker's popover panel provides it.
const panelClassName = 'flex flex-col gap-3 p-4'

const headerClassName = 'flex items-center justify-between'

const navButtonClassName = 'rounded px-2'

const headingButtonClassName =
  'inline-flex items-center gap-2 rounded px-2 text-sm font-semibold'

const headingTextClassName = 'text-sm font-semibold'

const gridClassName = 'flex flex-col gap-1 outline-none'

const rowClassName = 'grid grid-cols-7 gap-1'

const columnHeaderClassName = 'text-center text-xs uppercase'

// `group` lets the button inside style itself from the cell's data attributes.
const cellClassName = 'group flex items-center justify-center'

const dayButtonClassName =
  'h-9 w-9 rounded-full text-sm group-data-[today]:ring-1 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[outside-month]:text-gray-600 group-data-[disabled]:opacity-40'

const monthYearGridClassName = 'grid grid-cols-3 gap-1 outline-none'

const monthYearButtonClassName =
  'h-12 w-full rounded-md text-sm group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[disabled]:opacity-40'

// `ChildAttribute` is the type of the attributes a Block publishes to its
// consumer. Spread them onto whichever element you want to carry them.
const navButton = (
  attributes: ReadonlyArray<ChildAttribute>,
  label: string,
  h: DatePickerExampleViewBuilder,
): Html => h.button([...attributes, h.Class(navButtonClassName)], [label])

// The heading is a button: clicking it drills one level deeper (Days into
// Months, Months into Years). Pair the text with a chevron so the button reads
// as interactive at rest.
const headingButton = (
  heading: UiCalendarDaysModeAttributes['heading'],
  attributes: ReadonlyArray<ChildAttribute>,
  h: DatePickerExampleViewBuilder,
): Html =>
  h.button(
    [h.Id(heading.id), ...attributes, h.Class(headingButtonClassName)],
    [heading.text, ' ▾'],
  )

// Each Week carries its own row attributes and seven day cells, and each cell
// is a gridcell wrapping a button.
const weekRow = (week: UiCalendarWeek, h: DatePickerExampleViewBuilder): Html =>
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

// One view function per view mode. Each receives the attribute group for its
// own grid, so the fields it reads are exactly the fields that exist.
const daysView = (
  days: UiCalendarDaysModeAttributes,
  h: DatePickerExampleViewBuilder,
): Html =>
  h.div(
    [...days.root, h.Class(panelClassName)],
    [
      h.div(
        [h.Class(headerClassName)],
        [
          navButton(days.previousMonthButton, '‹', h),
          headingButton(days.heading, days.headingButton, h),
          navButton(days.nextMonthButton, '›', h),
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

// The months grid renders 12 cells (one per month). Clicking the heading again
// drills further into the years grid.
const monthsView = (
  months: UiCalendarMonthsModeAttributes,
  h: DatePickerExampleViewBuilder,
): Html =>
  h.div(
    [...months.root, h.Class(panelClassName)],
    [
      h.div(
        [h.Class('flex items-center justify-center')],
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

// The years grid renders 12 cells (one paged window). Prev/next page through
// 12-year windows; clicking a year drills back to the months grid for that
// year. Years is terminal, so its heading is text rather than a button.
const yearsView = (
  years: UiCalendarYearsModeAttributes,
  h: DatePickerExampleViewBuilder,
): Html =>
  h.div(
    [...years.root, h.Class(panelClassName)],
    [
      h.div(
        [h.Class(headerClassName)],
        [
          navButton(years.previousPageButton, '‹', h),
          h.h2(
            [h.Id(years.heading.id), h.Class(headingTextClassName)],
            [years.heading.text],
          ),
          navButton(years.nextPageButton, '›', h),
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

export const DatePickerExampleLive = DatePickerExample.make(
  Effect.fn(function* (_id, { today }) {
    // DatePicker holds its own Calendar and Popover instances
    const datePickerDemo = yield* new DatePicker.DatePicker('datePickerDemo', {
      id: 'date-picker-demo',
      today,
      minDate: today,
      maxDate: Calendar.addMonths(today, 3),
    })

    return {
      model: { datePickerDemo, maybeSelectedDate: Option.none() },

      update: {
        // `SelectedDate` carries the committed date; the popover has already
        // closed. `ClearedDate` fires when the user clears the selection.
        ...datePickerDemo.on({
          SelectedDate: (model, { date }) => ({
            model: modifyFields(model, {
              maybeSelectedDate: () => Option.some(date),
            }),
          }),
          ClearedDate: model => ({
            model: modifyFields(model, {
              maybeSelectedDate: () => Option.none(),
            }),
          }),
        }),
      },

      // `toCalendarView` receives a discriminated `CalendarAttributes` whose
      // variant matches the calendar's current `viewMode`. The trigger is a
      // form field, so name it with a visible label: target the trigger id
      // with `triggerId('date-picker-demo')` and pass `ariaLabelledBy`.
      view: (model, h) => {
        const labelId = 'date-picker-label'

        return h.div(
          [h.Class('flex flex-col gap-1.5')],
          [
            h.label(
              [h.Id(labelId), h.For(DatePickerTriggerId('date-picker-demo'))],
              ['Date'],
            ),
            model.datePickerDemo.view({
              ariaLabelledBy: labelId,
              anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
              // The parent-owned selection. The trigger content, the calendar's
              // selected-day marker, and the hidden form input all derive from it.
              maybeSelectedDate: model.maybeSelectedDate,
              triggerContent: maybeDate =>
                Option.match(maybeDate, {
                  onNone: () => h.span([], ['Pick a date']),
                  onSome: date =>
                    h.span([], [`${date.year}-${date.month}-${date.day}`]),
                }),
              toCalendarView: Match.type<UiCalendarCalendarAttributes>().pipe(
                Match.tagsExhaustive({
                  Days: days => daysView(days, h),
                  Months: months => monthsView(months, h),
                  Years: years => yearsView(years, h),
                }),
              ),
              // Optional: enable hidden form input for native <form> submission:
              name: 'appointment-date',
            }),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(DatePicker.DatePickerLive))
