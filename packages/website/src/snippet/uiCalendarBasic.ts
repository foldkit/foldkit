// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Calendar, Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Calendar as UiCalendar } from '@foldkit/ui'

// Add a field to your Model for the Calendar Submodel, plus a field the
// parent owns for the selected date. The calendar no longer stores the
// selection; the parent holds it and passes it back in as `maybeSelectedDate`.
const Model = S.Struct({
  calendarDemo: UiCalendar.Model,
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

// In your init function, pass the flags-resolved today into UiCalendar.init.
// `initialViewDate` seeds the month the calendar opens onto (pass your
// initial selection to open on it). The parent owns the selection itself:
const init = (flags: Flags) => [
  {
    calendarDemo: UiCalendar.init({
      id: 'calendar-demo',
      today: flags.today,
      initialViewDate: flags.today,
    }),
    maybeSelectedDate: Option.none(),
    // ...your other fields
  },
  [],
]

// Embed the Calendar Message in your parent Message for navigation and
// keyboard routing:
const GotCalendarMessage = m('GotCalendarMessage', {
  message: UiCalendar.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate
// navigation, focus, and picker-mode transitions to UiCalendar.update.
// Its third tuple element is `Option<OutMessage>`. When the user
// commits a date (click, Enter, or Space) it carries `SelectedDate({ date })`.
// `ChangedViewMonth` fires when navigation shifts the visible month
// without selecting a date.
GotCalendarMessage: ({ message }) => {
  const [nextCalendar, commands, maybeOutMessage] = UiCalendar.update(
    model.calendarDemo,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotCalendarMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { calendarDemo: () => nextCalendar }),
      mappedCommands,
    ],
    onSome: M.type<UiCalendar.OutMessage>().pipe(
      M.tagsExhaustive({
        SelectedDate: ({ date }) => [
          // The child has emitted `SelectedDate`. The body commits
          // the child's next state as usual. This is where the parent
          // lifts the committed date into its own field. That field is
          // then passed back to the calendar as `maybeSelectedDate`, so
          // the parent stays the single source of truth for the selection.
          evo(model, {
            calendarDemo: () => nextCalendar,
            maybeSelectedDate: () => Option.some(date),
          }),
          mappedCommands,
        ],
        ChangedViewMonth: () => [
          // The child has emitted `ChangedViewMonth`. The body commits
          // the child's next state as usual. In this arm the parent
          // can also update its own state or dispatch its own
          // Commands, for example prefetch month data, fire analytics,
          // or trigger a downstream Command.
          evo(model, { calendarDemo: () => nextCalendar }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, render the calendar. The `toView` callback
// receives a discriminated `CalendarAttributes` whose variant matches the
// calendar's current `viewMode`. Pattern-match on `_tag` to render the
// day grid, the months grid, or the years grid:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: model.calendarDemo.id,
    model: model.calendarDemo,
    view: UiCalendar.view,
    viewInputs: {
      // The parent-owned selection. The selected-day marker derives from it.
      maybeSelectedDate: model.maybeSelectedDate,
      toView: attributes =>
        M.value(attributes).pipe(
          M.tagsExhaustive({
            Days: days =>
              h.div(
                [
                  ...days.root,
                  h.Class('flex flex-col gap-3 rounded-xl border p-4'),
                ],
                [
                  h.div(
                    [h.Class('flex items-center justify-between')],
                    [
                      h.button(
                        [...days.previousMonthButton, h.Class('rounded px-2')],
                        ['‹'],
                      ),
                      // The heading is a button: clicking it switches to the
                      // months grid for fast navigation. Pair the text with a
                      // chevron so the button reads as interactive at rest.
                      h.button(
                        [
                          h.Id(days.heading.id),
                          ...days.headingButton,
                          h.Class(
                            'inline-flex items-center gap-2 rounded px-2 text-sm font-semibold',
                          ),
                        ],
                        [days.heading.text, ' ▾'],
                      ),
                      h.button(
                        [...days.nextMonthButton, h.Class('rounded px-2')],
                        ['›'],
                      ),
                    ],
                  ),
                  h.div(
                    [...days.grid, h.Class('flex flex-col gap-1 outline-none')],
                    [
                      h.div(
                        [...days.headerRow, h.Class('grid grid-cols-7 gap-1')],
                        days.columnHeaders.map(header =>
                          h.div(
                            [
                              ...header.attributes,
                              h.Class('text-center text-xs uppercase'),
                            ],
                            [header.name],
                          ),
                        ),
                      ),
                      ...days.weeks.map(week =>
                        h.div(
                          [
                            ...week.attributes,
                            h.Class('grid grid-cols-7 gap-1'),
                          ],
                          week.cells.map(cell =>
                            h.div(
                              // `group` lets day buttons style themselves from
                              // parent state via group-data-[today],
                              // group-data-[selected], etc.
                              [
                                ...cell.cellAttributes,
                                h.Class(
                                  'group flex items-center justify-center',
                                ),
                              ],
                              [
                                h.button(
                                  [
                                    ...cell.buttonAttributes,
                                    h.Class(
                                      'h-9 w-9 rounded-full text-sm group-data-[today]:ring-1 group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[outside-month]:text-gray-400 group-data-[disabled]:opacity-40',
                                    ),
                                  ],
                                  [cell.label],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            // The months grid renders 12 cells (one per month). Clicking the
            // heading again drills further into the years grid.
            Months: months =>
              h.div(
                [
                  ...months.root,
                  h.Class('flex flex-col gap-3 rounded-xl border p-4'),
                ],
                [
                  h.div(
                    [h.Class('flex items-center justify-center')],
                    [
                      h.button(
                        [
                          h.Id(months.heading.id),
                          ...months.headingButton,
                          h.Class(
                            'inline-flex items-center gap-2 rounded px-2 text-sm font-semibold',
                          ),
                        ],
                        [months.heading.text, ' ▾'],
                      ),
                    ],
                  ),
                  h.div(
                    [
                      ...months.grid,
                      h.Class('grid grid-cols-3 gap-1 outline-none'),
                    ],
                    months.cells.map(cell =>
                      h.div(
                        [
                          ...cell.cellAttributes,
                          h.Class('group flex items-center justify-center'),
                        ],
                        [
                          h.button(
                            [
                              ...cell.buttonAttributes,
                              h.Class(
                                'h-12 w-full rounded-md text-sm group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[disabled]:opacity-40',
                              ),
                            ],
                            [cell.shortLabel],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            // The years grid renders 12 cells (one paged window). Prev/next
            // page through 12-year windows; clicking a year drills back to
            // the months grid for that year.
            Years: years =>
              h.div(
                [
                  ...years.root,
                  h.Class('flex flex-col gap-3 rounded-xl border p-4'),
                ],
                [
                  h.div(
                    [h.Class('flex items-center justify-between')],
                    [
                      h.button(
                        [...years.previousPageButton, h.Class('rounded px-2')],
                        ['‹'],
                      ),
                      h.h2(
                        [
                          h.Id(years.heading.id),
                          h.Class('text-sm font-semibold'),
                        ],
                        [years.heading.text],
                      ),
                      h.button(
                        [...years.nextPageButton, h.Class('rounded px-2')],
                        ['›'],
                      ),
                    ],
                  ),
                  h.div(
                    [
                      ...years.grid,
                      h.Class('grid grid-cols-3 gap-1 outline-none'),
                    ],
                    years.cells.map(cell =>
                      h.div(
                        [
                          ...cell.cellAttributes,
                          h.Class('group flex items-center justify-center'),
                        ],
                        [
                          h.button(
                            [
                              ...cell.buttonAttributes,
                              h.Class(
                                'h-12 w-full rounded-md text-sm group-data-[selected]:bg-accent-600 group-data-[selected]:text-white group-data-[disabled]:opacity-40',
                              ),
                            ],
                            [cell.label],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
          }),
        ),
    },
    toParentMessage: message => GotCalendarMessage({ message }),
  })
}
