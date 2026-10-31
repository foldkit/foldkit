import { Effect, Layer, Match, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import { inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as UiCalendar from '../calendar/block.js'
import * as Popover from '../popover/block.js'
import {
  DatePicker,
  DatePickerLive,
  type ViewInputs,
  triggerId,
} from './block.js'

const acknowledgeAnchorPopover = Scene.Mount.resolve(
  Popover.AnchorPopover,
  Popover.Message.CompletedAnchorPopover(),
)
const acknowledgePopoverBackdrop = Scene.Mount.resolve(
  Popover.PortalPopoverBackdrop,
  Popover.Message.CompletedPortalPopoverBackdrop(),
)

const today = Calendar.make(2026, 4, 13)

const resolveFocusGrid = Scene.Command.resolve(
  UiCalendar.FocusGrid,
  UiCalendar.Message.CompletedFocusGrid(),
)

const germanCalendarViewLabels: UiCalendar.ViewLabels = {
  previousMonthLabel: 'Vorheriger Monat',
  nextMonthLabel: 'Nächster Monat',
  previousYearsPageLabel: 'Vorherige 12 Jahre',
  nextYearsPageLabel: 'Nächste 12 Jahre',
  daysHeadingButtonLabel: 'Zur Monatsauswahl',
  monthsHeadingButtonLabel: 'Zur Jahresauswahl',
  toDaysGridLabel: monthYear => `Kalender, ${monthYear}`,
  toWeekLabel: weekStart =>
    `Woche ab ${Calendar.formatLong(weekStart, Calendar.defaultEnglishLocale)}`,
  toMonthsGridLabel: year => `Monatsauswahl, ${year}`,
  toYearsGridLabel: (startYear, endYear) =>
    `Jahresauswahl, ${startYear}–${endYear}`,
}

const testToCalendarView = (attrs: UiCalendar.CalendarAttributes) =>
  Match.value(attrs).pipe(
    Match.tagsExhaustive({
      Days: days =>
        ih.div(days.root, [
          ih.div(
            [],
            [
              ih.button(days.previousMonthButton, ['prev']),
              ih.button(
                [ih.Id(days.heading.id), ...days.headingButton],
                [days.heading.text],
              ),
              ih.button(days.nextMonthButton, ['next']),
            ],
          ),
          ih.div(days.grid, [
            ih.div(
              days.headerRow,
              days.columnHeaders.map(header =>
                ih.div(header.attributes, [header.name]),
              ),
            ),
            ...days.weeks.map(week =>
              ih.div(
                week.attributes,
                week.cells.map(cell =>
                  ih.div(cell.cellAttributes, [
                    ih.button(cell.buttonAttributes, [cell.label]),
                  ]),
                ),
              ),
            ),
          ]),
        ]),
      Months: months =>
        ih.div(months.root, [
          ih.div(
            [],
            [
              ih.button(
                [ih.Id(months.heading.id), ...months.headingButton],
                [months.heading.text],
              ),
            ],
          ),
          ih.div(
            months.grid,
            months.cells.map(cell =>
              ih.div(cell.cellAttributes, [
                ih.button(cell.buttonAttributes, [cell.label]),
              ]),
            ),
          ),
        ]),
      Years: years =>
        ih.div(years.root, [
          ih.div(
            [],
            [
              ih.button(years.previousPageButton, ['prev page']),
              ih.h2([ih.Id(years.heading.id)], [years.heading.text]),
              ih.button(years.nextPageButton, ['next page']),
            ],
          ),
          ih.div(
            years.grid,
            years.cells.map(cell =>
              ih.div(cell.cellAttributes, [
                ih.button(cell.buttonAttributes, [cell.label]),
              ]),
            ),
          ),
        ]),
    }),
  )

const triggerContent = (maybeDate: Option.Option<Calendar.CalendarDate>) =>
  ih.span(
    [],
    [
      Option.match(maybeDate, {
        onNone: () => 'Pick a date',
        onSome: date => `${date.year}-${date.month}-${date.day}`,
      }),
    ],
  )

type Overrides = Omit<
  Partial<ViewInputs>,
  'anchor' | 'triggerContent' | 'toCalendarView'
>

class DatePickerScene extends Block<DatePickerScene, Overrides>()(
  'DatePickerScene',
  { Model: Schema.Struct({ datePicker: DatePicker }) },
) {}

const DatePickerSceneLive = DatePickerScene.make(
  Effect.fn(function* (_id, overrides) {
    const datePicker = yield* new DatePicker('datePicker', {
      id: 'picker',
      today,
    })

    return {
      model: { datePicker },
      view: model =>
        model.datePicker.view({
          anchor: { placement: 'bottom-start' },
          maybeSelectedDate: Option.none(),
          triggerContent,
          toCalendarView: testToCalendarView,
          ...overrides,
        }),
    }
  }),
).pipe(Layer.provide(DatePickerLive))

const trigger = Scene.selector('#picker-popover-button')
const panel = Scene.selector('#picker-popover-panel')
const grid = Scene.role('grid')
const hiddenInput = Scene.selector('input[type="hidden"]')

const openPicker = [
  Scene.click(trigger),
  acknowledgeAnchorPopover,
  acknowledgePopoverBackdrop,
]

const drillIntoMonths = [
  ...openPicker,
  Scene.click(Scene.label('Zur Monatsauswahl')),
  resolveFocusGrid,
]

const drillIntoYears = [
  ...drillIntoMonths,
  Scene.click(Scene.label('Zur Jahresauswahl')),
  resolveFocusGrid,
]

describe('DatePicker', () => {
  describe('rendering', () => {
    it.effect(
      'renders the trigger button with type=button and default aria-expanded false',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          {},
          Scene.expect(trigger).toExist(),
          Scene.expect(trigger).toHaveAttr('type', 'button'),
          Scene.expect(trigger).toHaveAttr('aria-expanded', 'false'),
          Scene.expect(trigger).not.toHaveAttr('aria-controls'),
        ),
    )

    it.effect(
      'renders the trigger placeholder text when no date is selected',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          {},
          Scene.expect(trigger).toHaveText('Pick a date'),
        ),
    )

    it.effect(
      'renders the trigger with the selected date when one is set',
      () => {
        const selected = Calendar.make(2026, 4, 20)
        return Scene.scene(
          DatePickerSceneLive,
          { maybeSelectedDate: Option.some(selected) },
          Scene.expect(trigger).toHaveText('2026-4-20'),
        )
      },
    )

    it.effect(
      'does not render the calendar grid when the popover is closed',
      () =>
        Scene.scene(DatePickerSceneLive, {}, Scene.expect(grid).toBeAbsent()),
    )

    it.effect(
      'renders the calendar grid inside the popover panel when open',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          {},
          ...openPicker,
          Scene.expect(panel).toExist(),
          Scene.expect(grid).toExist(),
          Scene.expect(trigger).toHaveAttr(
            'aria-controls',
            'picker-popover-panel',
          ),
        ),
    )
  })

  describe('Calendar view labels', () => {
    it.effect('forwards Days-mode labels to the embedded Calendar', () =>
      Scene.scene(
        DatePickerSceneLive,
        germanCalendarViewLabels,
        ...openPicker,
        Scene.expect(Scene.label('Vorheriger Monat')).toExist(),
        Scene.expect(Scene.label('Nächster Monat')).toExist(),
        Scene.expect(Scene.label('Zur Monatsauswahl')).toExist(),
        Scene.expect(Scene.label('Kalender, April 2026')).toExist(),
        Scene.expect(Scene.label('Woche ab March 29, 2026')).toExist(),
      ),
    )

    it.effect('forwards Months-mode labels to the embedded Calendar', () =>
      Scene.scene(
        DatePickerSceneLive,
        germanCalendarViewLabels,
        ...drillIntoMonths,
        Scene.expect(Scene.label('Zur Jahresauswahl')).toExist(),
        Scene.expect(Scene.label('Monatsauswahl, 2026')).toExist(),
      ),
    )

    it.effect('forwards Years-mode labels to the embedded Calendar', () =>
      Scene.scene(
        DatePickerSceneLive,
        germanCalendarViewLabels,
        ...drillIntoYears,
        Scene.expect(Scene.label('Vorherige 12 Jahre')).toExist(),
        Scene.expect(Scene.label('Nächste 12 Jahre')).toExist(),
        Scene.expect(Scene.label('Jahresauswahl, 2016–2027')).toExist(),
      ),
    )
  })

  describe('contentFocus popover wiring', () => {
    it.effect('does not put tabindex on the popover panel when open', () =>
      Scene.scene(
        DatePickerSceneLive,
        {},
        ...openPicker,
        Scene.expect(panel).not.toHaveAttr('tabIndex'),
      ),
    )

    it.effect(
      'does not attach a blur handler to the popover panel when open',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          {},
          ...openPicker,
          Scene.expect(panel).not.toHaveHandler('blur'),
        ),
    )

    it.effect(
      'still attaches a keydown handler to the popover panel for Escape',
      () => {
        // NOTE: Keydown events bubble, so the panel handler catches Escape
        // presses even though focus lives on the calendar grid (a descendant).
        // Removing this while retaining contentFocus would break Escape-to-close.
        return Scene.scene(
          DatePickerSceneLive,
          {},
          ...openPicker,
          Scene.expect(panel).toHaveHandler('keydown'),
        )
      },
    )
  })

  describe('hidden form input', () => {
    it.effect('does not render a hidden input when no name is provided', () =>
      Scene.scene(
        DatePickerSceneLive,
        {},
        Scene.expect(hiddenInput).toBeAbsent(),
      ),
    )

    it.effect('renders a hidden input with the name when provided', () =>
      Scene.scene(
        DatePickerSceneLive,
        { name: 'dob' },
        Scene.expect(hiddenInput).toExist(),
        Scene.expect(hiddenInput).toHaveAttr('name', 'dob'),
      ),
    )

    it.effect(
      'emits an empty hidden input value when no date is selected',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          { name: 'dob' },
          Scene.expect(hiddenInput).toHaveValue(''),
        ),
    )

    it.effect('encodes the selected date as ISO YYYY-MM-DD', () => {
      const selected = Calendar.make(2026, 4, 5)
      return Scene.scene(
        DatePickerSceneLive,
        {
          name: 'dob',
          maybeSelectedDate: Option.some(selected),
        },
        Scene.expect(hiddenInput).toHaveValue('2026-04-05'),
      )
    })

    it.effect('pads single-digit months and days to two characters', () => {
      const selected = Calendar.make(2026, 1, 9)
      return Scene.scene(
        DatePickerSceneLive,
        {
          name: 'dob',
          maybeSelectedDate: Option.some(selected),
        },
        Scene.expect(hiddenInput).toHaveValue('2026-01-09'),
      )
    })
  })

  describe('trigger labeling', () => {
    it.effect(
      'no aria-label or aria-labelledby on the trigger by default',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          {},
          Scene.expect(trigger).not.toHaveAttr('aria-label'),
          Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-label to the trigger when ariaLabel is provided',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          { ariaLabel: 'Due date' },
          Scene.expect(trigger).toHaveAttr('aria-label', 'Due date'),
          Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-labelledby to the trigger when ariaLabelledBy is provided',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          { ariaLabelledBy: 'due-label' },
          Scene.expect(trigger).toHaveAttr('aria-labelledby', 'due-label'),
          Scene.expect(trigger).not.toHaveAttr('aria-label'),
        ),
    )

    it.effect(
      'prefers aria-label over aria-labelledby when both are provided',
      () =>
        Scene.scene(
          DatePickerSceneLive,
          {
            ariaLabel: 'Due date',
            ariaLabelledBy: 'due-label',
          },
          Scene.expect(trigger).toHaveAttr('aria-label', 'Due date'),
          Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it('triggerId derives the trigger id from the base id', () => {
      expect(triggerId('picker')).toBe('picker-popover-button')
    })
  })
})
