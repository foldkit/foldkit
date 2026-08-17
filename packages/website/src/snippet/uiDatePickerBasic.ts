// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Calendar, Update } from 'foldkit'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { DatePicker, Calendar as UiCalendar } from '@foldkit/ui'

// Add a field to your Model for the DatePicker Submodel, plus a field the
// parent owns for the selected date. The picker no longer stores the
// selection; the parent holds it and passes it back in as `maybeSelectedDate`.
const Model = S.Struct({
  datePickerDemo: DatePicker.Model,
  maybeSelectedDate: S.Option(Calendar.CalendarDate),
  // ...your other fields
})

// Fetch `today` once at the app boundary via flags so init stays pure:
const Flags = S.Struct({
  today: Calendar.CalendarDate,
  // ...your other flags
})

const flags = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today /* ...your other flags */ }
})

// In your init function, pass the flags-resolved today into DatePicker.init.
// Optional: constrain the selectable range with minDate / maxDate.
const init = (flags: Flags) => [
  {
    datePickerDemo: DatePicker.init({
      id: 'date-picker-demo',
      today: flags.today,
      minDate: flags.today,
      maxDate: Calendar.addMonths(flags.today, 3),
    }),
    maybeSelectedDate: Option.none(),
    // ...your other fields
  },
  [],
]

// Embed the DatePicker Message in your parent Message. DatePicker handles
// Calendar + Popover routing internally. You only need one wrapper:
const GotDatePickerMessage = m('GotDatePickerMessage', {
  message: DatePicker.Message,
})

// At module scope, fold the OutMessage into your own Model. `SelectedDate`
// carries the committed date. The popover has already closed by the time it
// fires; lift the date into your domain state and pass it back as
// `maybeSelectedDate`. `ClearedDate` fires when the user clears the selection.
// `ChangedViewMonth` fires when calendar navigation shifts the visible month
// without selecting a date. Each arm returns an Update.Step over the parent
// Model, which already has the next DatePicker Model written back:
const foldDatePickerOutMessage = M.type<DatePicker.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    // The child has emitted `SelectedDate`. This is where the parent lifts
    // the committed date into its own field, which is then passed back to
    // the picker as `maybeSelectedDate`, so the parent stays the single
    // source of truth for the selection.
    SelectedDate:
      ({ date }) =>
      model => [evo(model, { maybeSelectedDate: () => Option.some(date) }), []],
    // The user cleared the selection. Reset the parent's field.
    ClearedDate: () => model => [
      evo(model, { maybeSelectedDate: () => Option.none() }),
      [],
    ],
    // The child has emitted `ChangedViewMonth`. In this arm the parent can
    // update its own state or dispatch its own Commands, for example
    // prefetch month data, fire analytics, or trigger a downstream Command.
    ChangedViewMonth: () => model => [model, []],
  }),
)

// Update.foldChild wires the child into the parent: it delegates navigation,
// focus, and popover messages to DatePicker.update, writes the next DatePicker
// Model back, maps the Submodel's Commands into your Message type, and hands
// any OutMessage to foldOutMessage.
const foldDatePicker = Update.foldChild({
  update: DatePicker.update,
  read: (model: Model) => Option.some(model.datePickerDemo),
  write: (model, nextDatePickerDemo) =>
    evo(model, { datePickerDemo: () => nextDatePickerDemo }),
  toParentMessage: message => GotDatePickerMessage({ message }),
  foldOutMessage: foldDatePickerOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotDatePickerMessage: ({ message }) => foldDatePicker(model, message)

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
  'h-9 w-9 rounded-full text-sm group-data-[today]:ring-1 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[outside-month]:text-gray-400 group-data-[disabled]:opacity-40'

const monthYearGridClassName = 'grid grid-cols-3 gap-1 outline-none'

const monthYearButtonClassName =
  'h-12 w-full rounded-md text-sm group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[disabled]:opacity-40'

// `ChildAttribute` is the type of the attributes a Submodel publishes to its
// consumer. Spread them onto whichever element you want to carry them.
const navButton = (
  attributes: ReadonlyArray<ChildAttribute>,
  label: string,
  h: HtmlBuilder<Message>,
): Html => h.button([...attributes, h.Class(navButtonClassName)], [label])

// The heading is a button: clicking it drills one level deeper (Days into
// Months, Months into Years). Pair the text with a chevron so the button reads
// as interactive at rest.
const headingButton = (
  heading: UiCalendar.DaysModeAttributes['heading'],
  attributes: ReadonlyArray<ChildAttribute>,
  h: HtmlBuilder<Message>,
): Html =>
  h.button(
    [h.Id(heading.id), ...attributes, h.Class(headingButtonClassName)],
    [heading.text, ' ▾'],
  )

// Each Week carries its own row attributes and seven day cells, and each cell
// is a gridcell wrapping a button.
const weekRow = (week: UiCalendar.Week, h: HtmlBuilder<Message>): Html =>
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
  days: UiCalendar.DaysModeAttributes,
  h: HtmlBuilder<Message>,
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
  months: UiCalendar.MonthsModeAttributes,
  h: HtmlBuilder<Message>,
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
  years: UiCalendar.YearsModeAttributes,
  h: HtmlBuilder<Message>,
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

// Inside your view function, embed the DatePicker via h.submodel. The
// `toCalendarView` callback receives a discriminated `CalendarAttributes`
// whose variant matches the calendar's current `viewMode`, so the match hands
// each grid to its own view function.
//
// The trigger is a form field, so give it an accessible name. Pass
// `ariaLabelledBy` with the id of a visible label element, and render that
// label targeting the trigger id with
// `DatePicker.triggerId('date-picker-demo')` for a native `<label for>`. The
// attribute is only emitted when provided, so the trigger never carries a
// dangling `aria-labelledby`.
const view = (model: Model, h: HtmlBuilder<Message>) => {
  const labelId = 'date-picker-label'

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label(
        [h.Id(labelId), h.For(DatePicker.triggerId('date-picker-demo'))],
        ['Date'],
      ),
      h.submodel({
        slotId: 'date-picker-demo',
        model: model.datePickerDemo,
        view: DatePicker.view,
        viewInputs: {
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
          toCalendarView: M.type<UiCalendar.CalendarAttributes>().pipe(
            M.tagsExhaustive({
              Days: days => daysView(days, h),
              Months: months => monthsView(months, h),
              Years: years => yearsView(years, h),
            }),
          ),
          // Optional: enable hidden form input for native <form> submission:
          name: 'appointment-date',
        },
        toParentMessage: message => GotDatePickerMessage({ message }),
      }),
    ],
  )
}
