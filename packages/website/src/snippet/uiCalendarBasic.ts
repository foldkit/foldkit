// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Calendar, Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Id, button, div, h2 } from './html'

// Add a field to your Model for the Calendar Submodel:
const Model = S.Struct({
  calendarDemo: Ui.Calendar.Model,
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

// In your init function, pass the flags-resolved today into Calendar.init:
const init = (flags: Flags) => [
  {
    calendarDemo: Ui.Calendar.init({
      id: 'calendar-demo',
      today: flags.today,
    }),
    // ...your other fields
  },
  [],
]

// Embed the Calendar Message in your parent Message for navigation and
// keyboard routing:
const GotCalendarMessage = m('GotCalendarMessage', {
  message: Ui.Calendar.Message,
})

// Add your own domain Message for selection events. The Calendar view
// dispatches this via the `onSelectedDate` callback below — your update can
// validate, save, navigate, etc., then write the selection back into the
// Calendar's internal state.
const SelectedCalendarDate = m('SelectedCalendarDate', {
  date: Calendar.CalendarDate,
})

// Inside your update function's M.tagsExhaustive({...}), handle the two
// paths. `GotCalendarMessage` delegates navigation, focus, and picker-mode
// transitions to the Calendar's own update:
GotCalendarMessage: ({ message }) => {
  const [nextCalendar, commands] = Ui.Calendar.update(
    model.calendarDemo,
    message,
  )

  return [
    evo(model, { calendarDemo: () => nextCalendar }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotCalendarMessage({ message }))),
    ),
  ]
}

// `SelectedCalendarDate` is dispatched by the view's `onSelectedDate`
// callback when the user commits a date (click, Enter, or Space). Your
// handler runs domain side effects, then writes the selection back to
// Calendar via `Calendar.selectDate` so its internal cursor + selected
// cell stay in sync.
SelectedCalendarDate: ({ date }) => {
  const [nextCalendar, commands] = Ui.Calendar.selectDate(
    model.calendarDemo,
    date,
  )

  return [
    // Optionally store the selection in your own state too, e.g. for form
    // submission or validation:
    evo(model, {
      calendarDemo: () =>
        nextCalendar /*, pickedDate: () => Option.some(date) */,
    }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotCalendarMessage({ message }))),
    ),
  ]
}

// Inside your view function, render the calendar. The `onSelectedDate`
// callback converts a committed date into your parent Message. The `toView`
// callback receives a discriminated `CalendarAttributes` whose variant
// matches the calendar's current `viewMode` — pattern-match on `_tag` to
// render the day grid, the months grid, or the years grid:
Ui.Calendar.view({
  model: model.calendarDemo,
  toParentMessage: message => GotCalendarMessage({ message }),
  onSelectedDate: date => SelectedCalendarDate({ date }),
  toView: attributes =>
    M.value(attributes).pipe(
      M.tagsExhaustive({
        Days: days =>
          div(
            [...days.root, Class('flex flex-col gap-3 rounded-xl border p-4')],
            [
              div(
                [Class('flex items-center justify-between')],
                [
                  button(
                    [...days.previousMonthButton, Class('rounded px-2')],
                    ['‹'],
                  ),
                  // The heading is a button: clicking it switches to the
                  // months grid for fast navigation. Pair the text with a
                  // chevron so the button reads as interactive at rest.
                  button(
                    [
                      Id(days.heading.id),
                      ...days.headingButton,
                      Class(
                        'inline-flex items-center gap-2 rounded px-2 text-sm font-semibold',
                      ),
                    ],
                    [days.heading.text, ' ▾'],
                  ),
                  button(
                    [...days.nextMonthButton, Class('rounded px-2')],
                    ['›'],
                  ),
                ],
              ),
              div(
                [...days.grid, Class('flex flex-col gap-1 outline-none')],
                [
                  div(
                    [...days.headerRow, Class('grid grid-cols-7 gap-1')],
                    days.columnHeaders.map(header =>
                      div(
                        [
                          ...header.attributes,
                          Class('text-center text-xs uppercase'),
                        ],
                        [header.name],
                      ),
                    ),
                  ),
                  ...days.weeks.map(week =>
                    div(
                      [...week.attributes, Class('grid grid-cols-7 gap-1')],
                      week.cells.map(cell =>
                        div(
                          // `group` lets day buttons react to parent state
                          // via group-data-[today], group-data-[selected],
                          // etc.
                          [
                            ...cell.cellAttributes,
                            Class('group flex items-center justify-center'),
                          ],
                          [
                            button(
                              [
                                ...cell.buttonAttributes,
                                Class(
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
          div(
            [
              ...months.root,
              Class('flex flex-col gap-3 rounded-xl border p-4'),
            ],
            [
              div(
                [Class('flex items-center justify-center')],
                [
                  button(
                    [
                      Id(months.heading.id),
                      ...months.headingButton,
                      Class(
                        'inline-flex items-center gap-2 rounded px-2 text-sm font-semibold',
                      ),
                    ],
                    [months.heading.text, ' ▾'],
                  ),
                ],
              ),
              div(
                [...months.grid, Class('grid grid-cols-3 gap-1 outline-none')],
                months.cells.map(cell =>
                  div(
                    [
                      ...cell.cellAttributes,
                      Class('group flex items-center justify-center'),
                    ],
                    [
                      button(
                        [
                          ...cell.buttonAttributes,
                          Class(
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
          div(
            [...years.root, Class('flex flex-col gap-3 rounded-xl border p-4')],
            [
              div(
                [Class('flex items-center justify-between')],
                [
                  button(
                    [...years.previousPageButton, Class('rounded px-2')],
                    ['‹'],
                  ),
                  h2(
                    [Id(years.heading.id), Class('text-sm font-semibold')],
                    [years.heading.text],
                  ),
                  button(
                    [...years.nextPageButton, Class('rounded px-2')],
                    ['›'],
                  ),
                ],
              ),
              div(
                [...years.grid, Class('grid grid-cols-3 gap-1 outline-none')],
                years.cells.map(cell =>
                  div(
                    [
                      ...cell.cellAttributes,
                      Class('group flex items-center justify-center'),
                    ],
                    [
                      button(
                        [
                          ...cell.buttonAttributes,
                          Class(
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
})
