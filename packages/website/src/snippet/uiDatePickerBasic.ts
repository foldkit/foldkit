// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Calendar, Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Id, button, div, h2, span } from './html'

// Add a field to your Model for the DatePicker Submodel:
const Model = S.Struct({
  datePickerDemo: Ui.DatePicker.Model,
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
    datePickerDemo: Ui.DatePicker.init({
      id: 'date-picker-demo',
      today: flags.today,
      minDate: flags.today,
      maxDate: Calendar.addMonths(flags.today, 3),
    }),
    // ...your other fields
  },
  [],
]

// Embed the DatePicker Message in your parent Message. DatePicker handles
// Calendar + Popover routing internally — you only need one wrapper:
const GotDatePickerMessage = m('GotDatePickerMessage', {
  message: Ui.DatePicker.Message,
})

// Add a domain Message for selection events. The DatePicker view dispatches
// this via the `onSelectedDate` callback — your update handler decides what
// to do with the date (validate, save, navigate, etc.), then writes it back
// via `DatePicker.selectDate` to sync internal state.
const SelectedDate = m('SelectedDate', {
  date: Calendar.CalendarDate,
})

// Inside your update function's M.tagsExhaustive({...}), handle both paths.
// `GotDatePickerMessage` delegates navigation, focus, and popover messages
// to DatePicker's own update:
GotDatePickerMessage: ({ message }) => {
  const [nextDatePicker, commands] = Ui.DatePicker.update(
    model.datePickerDemo,
    message,
  )

  return [
    evo(model, { datePickerDemo: () => nextDatePicker }),
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotDatePickerMessage({ message })),
      ),
    ),
  ]
}

// `SelectedDate` is dispatched by the view's `onSelectedDate` callback when
// the user commits a date. Write the selection back to DatePicker via
// `DatePicker.selectDate` so its internal state stays in sync:
SelectedDate: ({ date }) => {
  const [nextDatePicker, commands] = Ui.DatePicker.selectDate(
    model.datePickerDemo,
    date,
  )

  return [
    evo(model, { datePickerDemo: () => nextDatePicker }),
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotDatePickerMessage({ message })),
      ),
    ),
  ]
}

// Inside your view function, render the date picker. The `onSelectedDate`
// callback converts a committed date into your parent Message. The
// `toCalendarView` callback lays out the calendar grid — same shape as
// Calendar.view's `toView`:
Ui.DatePicker.view({
  model: model.datePickerDemo,
  toParentMessage: message => GotDatePickerMessage({ message }),
  onSelectedDate: date => SelectedDate({ date }),
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
  triggerContent: maybeDate =>
    Option.match(maybeDate, {
      onNone: () => span([], ['Pick a date']),
      onSome: date => span([], [`${date.year}-${date.month}-${date.day}`]),
    }),
  toCalendarView: attributes =>
    div(
      [...attributes.root, Class('flex flex-col gap-3 p-4')],
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
  // Optional: enable hidden form input for native <form> submission:
  name: 'appointment-date',
})
