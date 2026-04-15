import { describe, it } from '@effect/vitest'
import { Option } from 'effect'

import * as Calendar from '../../calendar'
import { html } from '../../html'
import * as Scene from '../../test/scene'
import type { CalendarAttributes, Message, Model, ViewConfig } from './index'
import { init, update, view } from './index'

const { div, button, h2, select, option, Id, Value } = html<Message>()

const today = Calendar.make(2026, 4, 13)

/** Wires Calendar attribute groups into actual HTML elements so the scene
 * can query them. The structure mirrors what a real consumer would render —
 * each part lands on its semantically appropriate element. */
const testToView = (attrs: CalendarAttributes<Message>) =>
  div(attrs.root, [
    div(
      [],
      [
        button(attrs.previousMonthButton, ['prev']),
        h2([Id(attrs.heading.id)], [attrs.heading.text]),
        button(attrs.nextMonthButton, ['next']),
        select(
          attrs.monthSelect,
          attrs.monthOptions.map(o =>
            option([Value(String(o.value))], [o.label]),
          ),
        ),
        select(
          attrs.yearSelect,
          attrs.yearOptions.map(year =>
            option([Value(String(year))], [String(year)]),
          ),
        ),
      ],
    ),
    div(attrs.grid, [
      div(
        attrs.headerRow,
        attrs.columnHeaders.map(header =>
          div(header.attributes, [header.name]),
        ),
      ),
      ...attrs.weeks.map(week =>
        div(
          week.attributes,
          week.cells.map(cell =>
            div(cell.cellAttributes, [
              button(cell.buttonAttributes, [cell.label]),
            ]),
          ),
        ),
      ),
    ]),
  ])

const sceneView =
  (overrides: Partial<ViewConfig<Message>> = {}) =>
  (model: Model) =>
    view({
      model,
      toParentMessage: message => message,
      toView: testToView,
      ...overrides,
    })

const grid = Scene.getByRole('grid')
const previousMonthButton = Scene.getByLabel('Previous month')
const nextMonthButton = Scene.getByLabel('Next month')
const monthSelect = Scene.getByLabel('Select month')
const yearSelect = Scene.getByLabel('Select year')
const headingFor = (text: string) => Scene.getByText(text, { selector: 'h2' })
const dayButton = (label: string) => Scene.getByLabel(label)
const cellById = (modelId: string, year: number, month: number, day: number) =>
  Scene.selector(`#${modelId}-cell-${year}-${month}-${day}`)

describe('Calendar scene', () => {
  describe('rendering', () => {
    it('renders the grid with role, tabindex, and an explicit aria-label that leads with a non-numeric word', () => {
      // The aria-label leads with "Calendar," so VoiceOver's TTS engine can't
      // pattern-match "row 4 April 2026" into a date literal. See the scene
      // test below that asserts the exact format.
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(grid).toExist(),
        Scene.expect(grid).toHaveAttr('aria-label', 'Calendar, April 2026'),
        Scene.expect(grid).toHaveAttr('tabIndex', '0'),
      )
    })

    it('renders the formatted month and year in the heading', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(headingFor('April 2026')).toExist(),
      )
    })

    it('renders the previous and next month buttons with aria-labels', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(previousMonthButton).toExist(),
        Scene.expect(nextMonthButton).toExist(),
      )
    })

    it('emits type="button" on prev, next, and day-cell buttons so they do not submit a surrounding form', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(previousMonthButton).toHaveAttr('type', 'button'),
        Scene.expect(nextMonthButton).toHaveAttr('type', 'button'),
        Scene.expect(dayButton('Monday, April 13, 2026')).toHaveAttr(
          'type',
          'button',
        ),
      )
    })

    it('renders 42 day-cell buttons (6 weeks of 7)', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expectAll(Scene.all.role('gridcell')).toHaveCount(42),
      )
    })

    it('marks the today cell with data-today', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(cellById('test', 2026, 4, 13)).toHaveAttr(
          'data-today',
          '',
        ),
      )
    })

    it('marks outside-month cells with data-outside-month', () => {
      // 2026-04-01 is a Wednesday; the Sunday before (2026-03-29) is outside-month
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(cellById('test', 2026, 3, 29)).toHaveAttr(
          'data-outside-month',
          '',
        ),
      )
    })

    it('marks the selected cell with aria-selected and data-selected', () => {
      const selected = Calendar.make(2026, 4, 20)
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(
          init({
            id: 'test',
            today,
            maybeInitialSelectedDate: Option.some(selected),
          }),
        ),
        Scene.expect(cellById('test', 2026, 4, 20)).toHaveAttr(
          'aria-selected',
          'true',
        ),
        Scene.expect(cellById('test', 2026, 4, 20)).toHaveAttr(
          'data-selected',
          '',
        ),
      )
    })

    it('marks disabled cells with data-disabled and aria-disabled on the button', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(
          init({
            id: 'test',
            today,
            disabledDates: [Calendar.make(2026, 4, 14)],
          }),
        ),
        Scene.expect(cellById('test', 2026, 4, 14)).toHaveAttr(
          'data-disabled',
          '',
        ),
        Scene.expect(dayButton('Tuesday, April 14, 2026')).toHaveAttr(
          'aria-disabled',
          'true',
        ),
      )
    })

    it('points aria-activedescendant at the focused cell id', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-4-13',
        ),
      )
    })

    it('emits WAI-ARIA grid positional attributes (aria-rowcount, aria-colcount, aria-rowindex, aria-colindex)', () => {
      // 2026-04-13 sits in the third week row of the April 2026 grid (row 4
      // when you include the header row at rowindex 1). April 13 is a Monday,
      // so in a Sunday-first locale it lands in column 2.
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(grid).toHaveAttr('aria-rowcount', '7'),
        Scene.expect(grid).toHaveAttr('aria-colcount', '7'),
        Scene.expect(cellById('test', 2026, 4, 13)).toHaveAttr(
          'aria-colindex',
          '2',
        ),
      )
    })

    it('labels each week row so VoiceOver does not auto-compute the row name from its 7 descendant day labels', () => {
      // Without this explicit aria-label, VoiceOver computes the row's
      // accessible name from its descendants — a concatenation of all 7
      // day-button labels — and reads it on cross-row navigation.
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(Scene.getByLabel('Week of March 29, 2026')).toExist(),
        Scene.expect(Scene.getByLabel('Week of April 12, 2026')).toExist(),
      )
    })

    it('rotates column headers when locale firstDayOfWeek is Monday', () => {
      const mondayLocale: Calendar.LocaleConfig = {
        ...Calendar.defaultEnglishLocale,
        firstDayOfWeek: 'Monday',
      }
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today, locale: mondayLocale })),
        // First column header should be Monday's short name
        Scene.expectAll(Scene.all.role('columnheader')).toHaveCount(7),
        Scene.expect(Scene.getByLabel('Monday')).toExist(),
      )
    })
  })

  describe('interactions', () => {
    it('clicking a day selects it', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(dayButton('Monday, April 20, 2026')),
        Scene.expect(cellById('test', 2026, 4, 20)).toHaveAttr(
          'aria-selected',
          'true',
        ),
      )
    })

    it('clicking the next month button advances the heading to May 2026', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(nextMonthButton),
        Scene.expect(headingFor('May 2026')).toExist(),
      )
    })

    it('clicking the previous month button retreats the heading to March 2026', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(previousMonthButton),
        Scene.expect(headingFor('March 2026')).toExist(),
      )
    })

    it('clicking next month moves the focus cursor to the same day in the new month', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(nextMonthButton),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-5-13',
        ),
      )
    })

    it('clicking previous month moves the focus cursor to the same day in the new month', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(previousMonthButton),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-3-13',
        ),
      )
    })

    it('clicking next month clamps the focus cursor when the day does not exist in the new month', () => {
      // Jan 31 → Feb 28 (2026 is not a leap year)
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today: Calendar.make(2026, 1, 31) })),
        Scene.click(nextMonthButton),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-2-28',
        ),
      )
    })

    it('selecting a year from the dropdown moves the focus cursor to the same day in that year', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.change(yearSelect, '2030'),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2030-4-13',
        ),
      )
    })

    it('after clicking next month, the cell referenced by aria-activedescendant is rendered in the DOM', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(nextMonthButton),
        Scene.expect(cellById('test', 2026, 5, 13)).toExist(),
      )
    })

    it('after selecting a month from the dropdown, the cell referenced by aria-activedescendant is rendered in the DOM', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.change(monthSelect, '9'),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-9-13',
        ),
        Scene.expect(cellById('test', 2026, 9, 13)).toExist(),
      )
    })

    it('clicking an outside-month day moves both the view and the cursor to that day', () => {
      // May 5 2026 is rendered as an outside-month cell in April's grid
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(dayButton('Tuesday, May 5, 2026')),
        Scene.expect(headingFor('May 2026')).toExist(),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-5-5',
        ),
        Scene.expect(cellById('test', 2026, 5, 5)).toExist(),
      )
    })

    it('ArrowLeft at minDate boundary clamps the cursor to minDate', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(
          init({
            id: 'test',
            today,
            maybeMinDate: Option.some(today),
          }),
        ),
        Scene.keydown(grid, 'ArrowLeft'),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-4-13',
        ),
      )
    })

    it('ArrowRight at maxDate boundary clamps the cursor to maxDate', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(
          init({
            id: 'test',
            today,
            maybeMaxDate: Option.some(today),
          }),
        ),
        Scene.keydown(grid, 'ArrowRight'),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-4-13',
        ),
      )
    })

    it('ArrowRight skips a range of consecutive disabled days', () => {
      // Disable 14, 15, 16; ArrowRight from 13 should land on 17
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(
          init({
            id: 'test',
            today,
            disabledDates: [
              Calendar.make(2026, 4, 14),
              Calendar.make(2026, 4, 15),
              Calendar.make(2026, 4, 16),
            ],
          }),
        ),
        Scene.keydown(grid, 'ArrowRight'),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-4-17',
        ),
      )
    })

    it('tabbing out of the grid and back preserves the focus cursor', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.focus(grid),
        Scene.keydown(grid, 'ArrowRight'),
        Scene.blur(grid),
        Scene.focus(grid),
        Scene.expect(cellById('test', 2026, 4, 14)).toHaveAttr(
          'data-focused',
          '',
        ),
      )
    })

    it('clicking previous month after the focus has drifted puts the cursor back inside the visible grid', () => {
      // Navigate forward twice, then backward — the cursor must stay rendered
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(nextMonthButton),
        Scene.click(nextMonthButton),
        Scene.click(previousMonthButton),
        Scene.expect(headingFor('May 2026')).toExist(),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-5-13',
        ),
        Scene.expect(cellById('test', 2026, 5, 13)).toExist(),
      )
    })

    it('pressing ArrowRight moves the keyboard cursor forward by one day', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.keydown(grid, 'ArrowRight'),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-4-14',
        ),
      )
    })

    it('pressing PageDown advances to next month and emits ChangedViewMonth', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.keydown(grid, 'PageDown'),
        Scene.expect(headingFor('May 2026')).toExist(),
      )
    })

    it('changing the year dropdown updates the visible year', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.change(yearSelect, '2030'),
        Scene.expect(headingFor('April 2030')).toExist(),
      )
    })

    it('changing the month dropdown updates the visible month', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.change(monthSelect, '9'),
        Scene.expect(headingFor('September 2026')).toExist(),
      )
    })

    it('focusing the grid sets isGridFocused (data-focused appears on focused cell)', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.focus(grid),
        Scene.expect(cellById('test', 2026, 4, 13)).toHaveAttr(
          'data-focused',
          '',
        ),
      )
    })

    it('blurring the grid clears data-focused on the focused cell', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.focus(grid),
        Scene.blur(grid),
        Scene.expect(cellById('test', 2026, 4, 13)).not.toHaveAttr(
          'data-focused',
        ),
      )
    })
  })
})
