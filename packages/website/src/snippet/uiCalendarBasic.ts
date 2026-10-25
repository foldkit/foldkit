// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match, Option, Schema, Tuple } from 'effect'
import { Block, Calendar } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Calendar as UiCalendar } from '@foldkit/ui'
import type {
  CalendarAttributes as UiCalendarCalendarAttributes,
  DaysModeAttributes as UiCalendarDaysModeAttributes,
  MonthsModeAttributes as UiCalendarMonthsModeAttributes,
  Week as UiCalendarWeek,
  YearsModeAttributes as UiCalendarYearsModeAttributes,
} from '@foldkit/ui/calendar'

// Add a field to your Model for the Calendar Block, plus a field the
// parent owns for the selected date. The calendar no longer stores the
// selection; the parent holds it and passes it back in as `maybeSelectedDate`.
const Model = Schema.Struct({
  calendarDemo: UiCalendar.CalendarBlock.Model,
  maybeSelectedDate: Schema.Option(Calendar.CalendarDate),
  // ...your other fields
})

// Fetch `today` once at the app boundary via flags so init stays pure:
const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
  // ...your other flags
})

const flags = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today /* ...your other flags */ }
})

// This excerpt has no parent-owned facts. The Composition derives Calendar
// delivery from the Binding.
const Message = defineMessageUnion({})

const CalendarExampleDefinition = Block.makeDefinition('CalendarExample', {
  Model,
  Message,
  ChildInitContext: Flags,
})

// At module scope, fold the OutMessage into your own Model. When the user
// commits a date (click, Enter, or Space) it carries `SelectedDate({ date })`.
// `ChangedViewMonth` fires when navigation shifts the visible month without
// selecting a date. Each arm returns an Update.Step over the parent Model,
// which already has the next Calendar Model written back. The parent
// Definition checks every named variant and infers the parent Step:
const foldCalendarOutMessage = CalendarExampleDefinition.makeOutMessageFold(
  UiCalendar.CalendarBlock,
  {
    // The child has emitted `SelectedDate`. This is where the parent lifts
    // the committed date into its own field. That field is then passed back
    // to the calendar as `maybeSelectedDate`, so the parent stays the single
    // source of truth for the selection.
    SelectedDate: ({ date }) =>
      CalendarExampleDefinition.makeFieldsStep(() => ({
        maybeSelectedDate: () => Option.some(date),
      })),
    // The child has emitted `ChangedViewMonth`. In this arm the parent can
    // update its own state or dispatch its own Commands, for example
    // prefetch month data, fire analytics, or trigger a downstream Command.
    ChangedViewMonth: CalendarExampleDefinition.makeNoopStep,
  },
)

// The Binding wires the completed child Block into the parent: it delegates navigation,
// focus, and picker-mode transitions to UiCalendar.CalendarBlock.update, writes the next
// Calendar Model back, routes generated delivery and Command results,
// and hands any OutMessage to the OutMessage fold.
const CalendarBinding = CalendarExampleDefinition.makeBinding(
  UiCalendar.CalendarBlock,
  {
    field: 'calendarDemo',
    init: {
      contextToArgs: flags =>
        Tuple.make({
          id: 'calendar-demo',
          today: flags.today,
          initialViewDate: flags.today,
        }),
    },
  },
).withOutMessagePolicy({ fold: foldCalendarOutMessage })

const CalendarExampleComposition = CalendarExampleDefinition.makeComposition({
  bindings: [CalendarBinding],
})
type CalendarExampleViewBuilder = Block.ViewBuilderFor<
  typeof CalendarExampleComposition
>

// Pass the flags-resolved date through the child init context. `initialViewDate`
// seeds the month the calendar opens onto. The parent owns the selection.
const init = CalendarExampleComposition.makeInit(
  (flags: typeof Flags.Type) => ({
    childInitContext: flags,
    model: {
      maybeSelectedDate: Option.none(),
      // ...your other fields
    },
  }),
)

const update = CalendarExampleComposition.makeUpdate({})

// Class names live at module scope, and each view mode gets its own view
// function below.
const panelClassName = 'flex flex-col gap-3 rounded-xl border p-4'

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
  h: CalendarExampleViewBuilder,
): Html => h.button([...attributes, h.Class(navButtonClassName)], [label])

// The heading is a button: clicking it drills one level deeper (Days into
// Months, Months into Years). Pair the text with a chevron so the button reads
// as interactive at rest.
const headingButton = (
  heading: UiCalendarDaysModeAttributes['heading'],
  attributes: ReadonlyArray<ChildAttribute>,
  h: CalendarExampleViewBuilder,
): Html =>
  h.button(
    [h.Id(heading.id), ...attributes, h.Class(headingButtonClassName)],
    [heading.text, ' ▾'],
  )

// Each Week carries its own row attributes and seven day cells, and each cell
// is a gridcell wrapping a button.
const weekRow = (week: UiCalendarWeek, h: CalendarExampleViewBuilder): Html =>
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
  h: CalendarExampleViewBuilder,
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
  h: CalendarExampleViewBuilder,
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
  h: CalendarExampleViewBuilder,
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

// Inside your view function, render the calendar. The `toView` callback
// receives a discriminated `CalendarAttributes` whose variant matches the
// calendar's current `viewMode`, so the match hands each grid to its own view
// function:
const view = CalendarExampleComposition.makeView((model, h) => {
  const calendarView = Match.type<UiCalendarCalendarAttributes>().pipe(
    Match.tagsExhaustive({
      Days: days => daysView(days, h),
      Months: months => monthsView(months, h),
      Years: years => yearsView(years, h),
    }),
  )

  return h.block(
    CalendarBinding.embedView({
      slotId: model.calendarDemo.id,
      model: model.calendarDemo,
      viewInputs: {
        // The parent-owned selection. The selected-day marker derives from it.
        maybeSelectedDate: model.maybeSelectedDate,
        toView: calendarView,
      },
    }),
  )
})
