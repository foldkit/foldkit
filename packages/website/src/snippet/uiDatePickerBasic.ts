// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Calendar, Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { DatePicker } from '@foldkit/ui'

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

// Inside your update function's M.tagsExhaustive({...}), delegate
// navigation, focus, and popover messages to DatePicker.update. The
// OutMessage's `SelectedDate` carries the committed date. The popover
// has already closed by the time it fires; lift the date into your
// domain state and pass it back as `maybeSelectedDate`. `ClearedDate`
// fires when the user clears the selection. `ChangedViewMonth` fires when
// calendar navigation shifts the visible month without selecting a date.
GotDatePickerMessage: ({ message }) => {
  const [nextDatePicker, commands, maybeOutMessage] = DatePicker.update(
    model.datePickerDemo,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotDatePickerMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { datePickerDemo: () => nextDatePicker }),
      mappedCommands,
    ],
    onSome: M.type<DatePicker.OutMessage>().pipe(
      M.tagsExhaustive({
        SelectedDate: ({ date }) => [
          // The child has emitted `SelectedDate`. The body commits
          // the child's next state as usual. This is where the parent
          // lifts the committed date into its own field, which is then
          // passed back to the picker as `maybeSelectedDate`, so the
          // parent stays the single source of truth for the selection.
          evo(model, {
            datePickerDemo: () => nextDatePicker,
            maybeSelectedDate: () => Option.some(date),
          }),
          mappedCommands,
        ],
        ClearedDate: () => [
          // The user cleared the selection. Reset the parent's field.
          evo(model, {
            datePickerDemo: () => nextDatePicker,
            maybeSelectedDate: () => Option.none(),
          }),
          mappedCommands,
        ],
        ChangedViewMonth: () => [
          // The child has emitted `ChangedViewMonth`. The body commits
          // the child's next state as usual. In this arm the parent
          // can also update its own state or dispatch its own
          // Commands, for example prefetch month data, fire analytics,
          // or trigger a downstream Command.
          evo(model, { datePickerDemo: () => nextDatePicker }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, embed the DatePicker via h.submodel. The
// `toCalendarView` callback receives a discriminated `CalendarAttributes`
// whose variant matches the calendar's current `viewMode`. Pattern-match
// on `_tag` to render the day grid, the months grid, or the years grid.
//
// The trigger is a form field, so give it an accessible name. Pass
// `ariaLabelledBy` with the id of a visible label element, and render that
// label targeting the trigger id with
// `DatePicker.triggerId('date-picker-demo')` for a native `<label for>`. The
// attribute is only emitted when provided, so the trigger never carries a
// dangling `aria-labelledby`.
const view = (model: Model) => {
  const h = html<Message>()

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
          toCalendarView: attributes =>
            M.value(attributes).pipe(
              M.tagsExhaustive({
                Days: days =>
                  h.div(
                    [...days.root, h.Class('flex flex-col gap-3 p-4')],
                    [
                      h.div(
                        [h.Class('flex items-center justify-between')],
                        [
                          h.button(
                            [
                              ...days.previousMonthButton,
                              h.Class('rounded px-2'),
                            ],
                            ['‹'],
                          ),
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
                        [
                          ...days.grid,
                          h.Class('flex flex-col gap-1 outline-none'),
                        ],
                        [
                          h.div(
                            [
                              ...days.headerRow,
                              h.Class('grid grid-cols-7 gap-1'),
                            ],
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
                    [...months.root, h.Class('flex flex-col gap-3 p-4')],
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
                    [...years.root, h.Class('flex flex-col gap-3 p-4')],
                    [
                      h.div(
                        [h.Class('flex items-center justify-between')],
                        [
                          h.button(
                            [
                              ...years.previousPageButton,
                              h.Class('rounded px-2'),
                            ],
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
          // Optional: enable hidden form input for native <form> submission:
          name: 'appointment-date',
        },
        toParentMessage: message => GotDatePickerMessage({ message }),
      }),
    ],
  )
}
