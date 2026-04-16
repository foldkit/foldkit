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
// paths. `GotCalendarMessage` delegates navigation, focus, and dropdown
// messages to the Calendar's own update:
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
// callback receives attribute groups (grid, rows, buttons, dropdowns) plus
// the 6×7 grid of day cells to lay out however you like:
Ui.Calendar.view({
  model: model.calendarDemo,
  toParentMessage: message => GotCalendarMessage({ message }),
  onSelectedDate: date => SelectedCalendarDate({ date }),
  toView: attributes =>
    div(
      [...attributes.root, Class('flex flex-col gap-3 rounded-xl border p-4')],
      [
        div(
          [Class('flex items-center justify-between')],
          [
            button(
              [...attributes.previousMonthButton, Class('rounded px-2')],
              ['‹'],
            ),
            h2(
              [Id(attributes.heading.id), Class('text-sm font-semibold')],
              [attributes.heading.text],
            ),
            button(
              [...attributes.nextMonthButton, Class('rounded px-2')],
              ['›'],
            ),
          ],
        ),
        div(
          [...attributes.grid, Class('flex flex-col gap-1 outline-none')],
          [
            div(
              [...attributes.headerRow, Class('grid grid-cols-7 gap-1')],
              attributes.columnHeaders.map(header =>
                div(
                  [
                    ...header.attributes,
                    Class('text-center text-xs uppercase'),
                  ],
                  [header.name],
                ),
              ),
            ),
            ...attributes.weeks.map(week =>
              div(
                [...week.attributes, Class('grid grid-cols-7 gap-1')],
                week.cells.map(cell =>
                  div(
                    // `group` lets day buttons react to parent state via
                    // group-data-[today], group-data-[selected], etc.
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
})
