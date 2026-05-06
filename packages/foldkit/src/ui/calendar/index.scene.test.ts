import { describe, it } from '@effect/vitest'
import { Match as M } from 'effect'

import * as Calendar from '../../calendar/index.js'
import { html } from '../../html/index.js'
import * as Scene from '../../test/scene.js'
import type { CalendarAttributes, Message, Model, ViewConfig } from './index.js'
import { CompletedFocusGrid, FocusGrid, init, update, view } from './index.js'

const resolveFocusGrid = Scene.Command.resolve(FocusGrid, CompletedFocusGrid())

const { div, button, h2, Id } = html<Message>()

const today = Calendar.make(2026, 4, 13)

/** Wires Calendar attribute groups into actual HTML elements so the scene
 * can query them. Pattern-matches on `_tag` so each viewMode renders the
 * appropriate grid (days, months, years). */
const testToView = (attrs: CalendarAttributes<Message>) =>
  M.value(attrs).pipe(
    M.tagsExhaustive({
      Days: days =>
        div(days.root, [
          div(
            [],
            [
              button(days.previousMonthButton, ['prev']),
              button(
                [Id(days.heading.id), ...days.headingButton],
                [days.heading.text],
              ),
              button(days.nextMonthButton, ['next']),
            ],
          ),
          div(days.grid, [
            div(
              days.headerRow,
              days.columnHeaders.map(header =>
                div(header.attributes, [header.name]),
              ),
            ),
            ...days.weeks.map(week =>
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
        ]),
      Months: months =>
        div(months.root, [
          div(
            [],
            [
              button(
                [Id(months.heading.id), ...months.headingButton],
                [months.heading.text],
              ),
            ],
          ),
          div(
            months.grid,
            months.cells.map(cell =>
              div(cell.cellAttributes, [
                button(cell.buttonAttributes, [cell.label]),
              ]),
            ),
          ),
        ]),
      Years: years =>
        div(years.root, [
          div(
            [],
            [
              button(years.previousPageButton, ['prev page']),
              h2([Id(years.heading.id)], [years.heading.text]),
              button(years.nextPageButton, ['next page']),
            ],
          ),
          div(
            years.grid,
            years.cells.map(cell =>
              div(cell.cellAttributes, [
                button(cell.buttonAttributes, [cell.label]),
              ]),
            ),
          ),
        ]),
    }),
  )

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
const previousYearsPageButton = Scene.getByLabel('Previous 12 years')
const nextYearsPageButton = Scene.getByLabel('Next 12 years')
const monthsHeadingButton = Scene.getByLabel('Switch to month picker')
const yearsHeadingButton = Scene.getByLabel('Switch to year picker')
const daysHeadingFor = (text: string) =>
  Scene.getByText(text, { selector: 'button' })
const yearsHeadingFor = (text: string) =>
  Scene.getByText(text, { selector: 'h2' })
const dayButton = (label: string) => Scene.getByLabel(label)
const monthButtonForYear = (label: string, year: number) =>
  Scene.getByLabel(`${label} ${year}`)
const yearButton = (year: number) => Scene.getByLabel(String(year))
const dayCellById = (
  modelId: string,
  year: number,
  month: number,
  day: number,
) => Scene.selector(`#${modelId}-cell-${year}-${month}-${day}`)
const monthCellById = (modelId: string, month: number) =>
  Scene.selector(`#${modelId}-cell-month-${month}`)
const yearCellById = (modelId: string, year: number) =>
  Scene.selector(`#${modelId}-cell-year-${year}`)

describe('Calendar scene', () => {
  describe('rendering', () => {
    it('renders the grid with role, tabindex, and an explicit aria-label that leads with a non-numeric word', () => {
      // NOTE: The aria-label must lead with "Calendar," so VoiceOver's TTS
      // engine can't pattern-match "row 4 April 2026" into a date literal
      // and speak it as "row April 4, 2026". Do not switch this to
      // aria-labelledby={heading} — the heading text ("April 2026") starts
      // with a month name and triggers the TTS date-parsing path.
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
        Scene.expect(daysHeadingFor('April 2026')).toExist(),
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
        Scene.expect(dayCellById('test', 2026, 4, 13)).toHaveAttr(
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
        Scene.expect(dayCellById('test', 2026, 3, 29)).toHaveAttr(
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
            initialSelectedDate: selected,
          }),
        ),
        Scene.expect(dayCellById('test', 2026, 4, 20)).toHaveAttr(
          'aria-selected',
          'true',
        ),
        Scene.expect(dayCellById('test', 2026, 4, 20)).toHaveAttr(
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
        Scene.expect(dayCellById('test', 2026, 4, 14)).toHaveAttr(
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
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.expect(grid).toHaveAttr('aria-rowcount', '7'),
        Scene.expect(grid).toHaveAttr('aria-colcount', '7'),
        Scene.expect(dayCellById('test', 2026, 4, 13)).toHaveAttr(
          'aria-colindex',
          '2',
        ),
      )
    })

    it('labels each week row so VoiceOver does not auto-compute the row name from its 7 descendant day labels', () => {
      // NOTE: Without this explicit aria-label, VoiceOver computes the row's
      // accessible name from its descendants — a concatenation of all 7
      // day-button labels — and reads the whole row on cross-row navigation.
      // Do not remove the aria-label from week row attributes.
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
        Scene.expect(dayCellById('test', 2026, 4, 20)).toHaveAttr(
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
        Scene.expect(daysHeadingFor('May 2026')).toExist(),
      )
    })

    it('clicking the previous month button retreats the heading to March 2026', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(previousMonthButton),
        Scene.expect(daysHeadingFor('March 2026')).toExist(),
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

    it('after clicking next month, the cell referenced by aria-activedescendant is rendered in the DOM', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(nextMonthButton),
        Scene.expect(dayCellById('test', 2026, 5, 13)).toExist(),
      )
    })

    it('clicking an outside-month day moves both the view and the cursor to that day', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(dayButton('Tuesday, May 5, 2026')),
        Scene.expect(daysHeadingFor('May 2026')).toExist(),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-5-5',
        ),
        Scene.expect(dayCellById('test', 2026, 5, 5)).toExist(),
      )
    })

    it('ArrowLeft at minDate boundary clamps the cursor to minDate', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(
          init({
            id: 'test',
            today,
            minDate: today,
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
            maxDate: today,
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
        Scene.expect(dayCellById('test', 2026, 4, 14)).toHaveAttr(
          'data-focused',
          '',
        ),
      )
    })

    it('clicking previous month after the focus has drifted puts the cursor back inside the visible grid', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(nextMonthButton),
        Scene.click(nextMonthButton),
        Scene.click(previousMonthButton),
        Scene.expect(daysHeadingFor('May 2026')).toExist(),
        Scene.expect(grid).toHaveAttr(
          'aria-activedescendant',
          'test-cell-2026-5-13',
        ),
        Scene.expect(dayCellById('test', 2026, 5, 13)).toExist(),
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
        Scene.expect(daysHeadingFor('May 2026')).toExist(),
      )
    })

    it('focusing the grid sets isGridFocused (data-focused appears on focused cell)', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.focus(grid),
        Scene.expect(dayCellById('test', 2026, 4, 13)).toHaveAttr(
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
        Scene.expect(dayCellById('test', 2026, 4, 13)).not.toHaveAttr(
          'data-focused',
        ),
      )
    })
  })

  describe('mode transitions', () => {
    it('clicking the heading in Days mode switches to Months mode', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.expect(yearsHeadingButton).toExist(),
        Scene.expect(grid).toHaveAttr('aria-label', 'Month picker, 2026'),
      )
    })

    it('clicking the heading in Months mode switches to Years mode', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.expect(yearsHeadingFor('2016–2027')).toExist(),
        Scene.expect(previousYearsPageButton).toExist(),
        Scene.expect(nextYearsPageButton).toExist(),
      )
    })

    it('Months mode renders 12 month-cell buttons', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.expectAll(Scene.all.role('gridcell')).toHaveCount(12),
      )
    })

    it('Years mode renders 12 year-cell buttons', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.expectAll(Scene.all.role('gridcell')).toHaveCount(12),
      )
    })

    it('clicking a month cell returns to Days mode at that month', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(monthButtonForYear('September', 2026)),
        resolveFocusGrid,
        Scene.expect(daysHeadingFor('September 2026')).toExist(),
      )
    })

    it('clicking a year cell returns to Months mode at that year', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearButton(2020)),
        resolveFocusGrid,
        Scene.expect(yearsHeadingButton).toHaveText('2020'),
      )
    })

    it('clicking the next-page button in Years mode advances the window by 12 years', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.click(nextYearsPageButton),
        Scene.expect(yearsHeadingFor('2028–2039')).toExist(),
      )
    })

    it('clicking the previous-page button in Years mode retreats the window by 12 years', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.click(previousYearsPageButton),
        Scene.expect(yearsHeadingFor('2004–2015')).toExist(),
      )
    })

    it('Months grid marks the calendar viewMonth with aria-selected and data-selected', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.expect(monthCellById('test', 4)).toHaveAttr(
          'aria-selected',
          'true',
        ),
        Scene.expect(monthCellById('test', 4)).toHaveAttr('data-selected', ''),
      )
    })

    it('Years grid marks the calendar viewYear with aria-selected and data-selected', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.expect(yearCellById('test', 2026)).toHaveAttr(
          'aria-selected',
          'true',
        ),
        Scene.expect(yearCellById('test', 2026)).toHaveAttr(
          'data-selected',
          '',
        ),
      )
    })

    it('completes the full year-jump round trip: Days → Months → Years → pick year → pick month → Days', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearButton(2020)),
        resolveFocusGrid,
        Scene.click(monthButtonForYear('March', 2020)),
        resolveFocusGrid,
        Scene.expect(daysHeadingFor('March 2020')).toExist(),
      )
    })

    it('pressing Enter on a disabled focused month does not commit (view-layer filter)', () => {
      // maxDate clamps the calendar to April 2026; September 2026 is fully
      // disabled. Focus stays on April after Enter — no transition to Days.
      const maxDate = Calendar.make(2026, 4, 30)
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today, maxDate })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.keydown(grid, 'ArrowDown'),
        Scene.keydown(grid, 'ArrowDown'),
        Scene.keydown(grid, 'Enter'),
        Scene.expect(yearsHeadingButton).toExist(),
      )
    })

    it('pressing Enter on a disabled focused year does not commit (view-layer filter)', () => {
      // minDate clamps to 2020; arrowing back past 2020 lands the cursor on a
      // disabled year. Enter should be a no-op — cursor stays in Years mode.
      const minDate = Calendar.make(2020, 1, 1)
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test', today, minDate })),
        Scene.click(monthsHeadingButton),
        resolveFocusGrid,
        Scene.click(yearsHeadingButton),
        resolveFocusGrid,
        Scene.keydown(grid, 'PageUp'),
        Scene.keydown(grid, 'Enter'),
        Scene.expect(previousYearsPageButton).toExist(),
      )
    })
  })
})
