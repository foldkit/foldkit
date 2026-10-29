// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match, Option, Schema, Tuple } from 'effect'
import { Block, Calendar } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { DatePicker } from '@foldkit/ui'
import type {
  CalendarAttributes as UiCalendarCalendarAttributes,
  DaysModeAttributes as UiCalendarDaysModeAttributes,
  MonthsModeAttributes as UiCalendarMonthsModeAttributes,
  Week as UiCalendarWeek,
  YearsModeAttributes as UiCalendarYearsModeAttributes,
} from '@foldkit/ui/calendar'
import { triggerId as DatePickerTriggerId } from '@foldkit/ui/datePicker'

// Add a field to your Model for the DatePicker Block, plus a field the
// parent owns for the selected date. The picker no longer stores the
// selection; the parent holds it and passes it back in as `maybeSelectedDate`.
const Model = Schema.Struct({
  datePickerDemo: DatePicker.DatePickerBlock.Model,
  maybeSelectedDate: Schema.Option(Calendar.CalendarDate),
  // ...your other fields
})
type Model = typeof Model.Type
// Fetch `today` once at the app boundary via flags so init stays pure:
const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
  // ...your other flags
})
type Flags = typeof Flags.Type

const flags = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today /* ...your other flags */ }
})

// This excerpt has no parent-owned facts. DatePicker handles its Calendar and
// Popover children internally, and the parent Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

const DatePickerExampleDefinition = Block.makeDefinition('DatePickerExample', {
  Model,
  Message,
  ChildInitContext: Flags,
})

const { makeFieldsStep, makeNoopStep } = DatePickerExampleDefinition

// At module scope, fold the OutMessage into your own Model. `SelectedDate`
// carries the committed date. The popover has already closed by the time it
// fires; lift the date into your domain state and pass it back as
// `maybeSelectedDate`. `ClearedDate` fires when the user clears the selection.
// `ChangedViewMonth` fires when calendar navigation shifts the visible month
// without selecting a date. Each arm returns an Update.Step over the parent
// Model, which already has the next DatePicker Model written back. Pass the
// completed child Block so the parent Definition infers both contracts:
const foldDatePickerOutMessage = DatePickerExampleDefinition.makeOutMessageFold(
  DatePicker.DatePickerBlock,
  {
    // The child has emitted `SelectedDate`. This is where the parent lifts
    // the committed date into its own field, which is then passed back to
    // the picker as `maybeSelectedDate`, so the parent stays the single
    // source of truth for the selection.
    SelectedDate: ({ date }) =>
      makeFieldsStep(() => ({
        maybeSelectedDate: () => Option.some(date),
      })),
    // The user cleared the selection. Reset the parent's field.
    ClearedDate: () =>
      makeFieldsStep(() => ({
        maybeSelectedDate: () => Option.none(),
      })),
    // The child has emitted `ChangedViewMonth`. In this arm the parent can
    // update its own state or dispatch its own Commands, for example
    // prefetch month data, fire analytics, or trigger a downstream Command.
    ChangedViewMonth: makeNoopStep,
  },
)

// The Binding wires the completed child Block into the parent: it delegates navigation,
// focus, and popover messages to DatePicker.DatePickerBlock.update, writes the next DatePicker
// Model back, routes generated delivery and Command results, and hands
// any OutMessage to the OutMessage fold.
const DatePickerBinding = DatePickerExampleDefinition.makeBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'datePickerDemo',
    init: {
      contextToArgs: flags =>
        Tuple.make({
          id: 'date-picker-demo',
          today: flags.today,
          minDate: flags.today,
          maxDate: Calendar.addMonths(flags.today, 3),
        }),
    },
  },
).withOutMessagePolicy({ fold: foldDatePickerOutMessage })

const DatePickerExampleComposition =
  DatePickerExampleDefinition.makeComposition({
    bindings: [DatePickerBinding],
  })
type DatePickerExampleViewBuilder = Block.ViewBuilderFor<
  typeof DatePickerExampleComposition
>

// Pass the flags-resolved date through the child init context. The Composition
// supplies it to DatePickerBinding and initializes the bound Model.
const init = DatePickerExampleComposition.makeInit((flags: Flags) => ({
  childInitContext: flags,
  model: {
    maybeSelectedDate: Option.none(),
    // ...your other fields
  },
}))

const update = DatePickerExampleComposition.makeUpdate({})

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

// Inside your view function, embed the DatePicker via h.block. The
// `toCalendarView` callback receives a discriminated `CalendarAttributes`
// whose variant matches the calendar's current `viewMode`, so the match hands
// each grid to its own view function.
//
// The trigger is a form field, so give it an accessible name. Pass
// `ariaLabelledBy` with the id of a visible label element, and render that
// label targeting the trigger id with
// `triggerId('date-picker-demo')` from `@foldkit/ui/datePicker` for a native `<label for>`. The
// attribute is only emitted when provided, so the trigger never carries a
// dangling `aria-labelledby`.
const view = DatePickerExampleComposition.makeView((model, h) => {
  const labelId = 'date-picker-label'

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label(
        [h.Id(labelId), h.For(DatePickerTriggerId('date-picker-demo'))],
        ['Date'],
      ),
      h.block(
        DatePickerBinding.embedView({
          slotId: 'date-picker-demo',
          model: model.datePickerDemo,
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
            toCalendarView: Match.type<UiCalendarCalendarAttributes>().pipe(
              Match.tagsExhaustive({
                Days: days => daysView(days, h),
                Months: months => monthsView(months, h),
                Years: years => yearsView(years, h),
              }),
            ),
            // Optional: enable hidden form input for native <form> submission:
            name: 'appointment-date',
          },
        }),
      ),
    ],
  )
})
