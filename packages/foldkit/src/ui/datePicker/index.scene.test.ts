import { describe, it } from '@effect/vitest'
import { Match as M, Option } from 'effect'

import * as Calendar from '../../calendar/index.js'
import { html } from '../../html/index.js'
import * as Scene from '../../test/scene.js'
import * as UiCalendar from '../calendar/index.js'
import * as Popover from '../popover/public.js'
import type { Message, Model, ViewConfig } from './index.js'
import { GotPopoverMessage, Opened, init, update, view } from './index.js'

const acknowledgePopoverAnchor = Scene.Mount.resolve(
  Popover.PopoverAnchor,
  GotPopoverMessage({ message: Popover.CompletedAnchorMount() }),
)

const { button, div, h2, span, Id } = html<Message>()

const today = Calendar.make(2026, 4, 13)

const testToCalendarView = (attrs: UiCalendar.CalendarAttributes<Message>) =>
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

const triggerContent = (maybeDate: Option.Option<Calendar.CalendarDate>) =>
  span(
    [],
    [
      Option.match(maybeDate, {
        onNone: () => 'Pick a date',
        onSome: date => `${date.year}-${date.month}-${date.day}`,
      }),
    ],
  )

const sceneView =
  (overrides: Partial<ViewConfig<Message>> = {}) =>
  (model: Model) =>
    view({
      model,
      toParentMessage: message => message,
      anchor: { placement: 'bottom-start' },
      triggerContent,
      toCalendarView: testToCalendarView,
      ...overrides,
    })

const trigger = Scene.selector('[key="picker-popover-button"]')
const panel = Scene.selector('[key="picker-popover-panel-container"]')
const grid = Scene.getByRole('grid')
const hiddenInput = Scene.selector('input[type="hidden"]')

const closedModel = init({ id: 'picker', today })
const [openModel] = update(closedModel, Opened())

describe('DatePicker scene', () => {
  describe('rendering', () => {
    it('renders the trigger button with type=button and default aria-expanded false', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(trigger).toExist(),
        Scene.expect(trigger).toHaveAttr('type', 'button'),
        Scene.expect(trigger).toHaveAttr('aria-expanded', 'false'),
      )
    })

    it('renders the trigger placeholder text when no date is selected', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(trigger).toHaveText('Pick a date'),
      )
    })

    it('renders the trigger with the selected date when one is set', () => {
      const seeded = init({
        id: 'picker',
        today,
        initialSelectedDate: Calendar.make(2026, 4, 20),
      })
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(seeded),
        Scene.expect(trigger).toHaveText('2026-4-20'),
      )
    })

    it('does not render the calendar grid when the popover is closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(grid).toBeAbsent(),
      )
    })

    it('renders the calendar grid inside the popover panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toExist(),
        Scene.expect(grid).toExist(),
        acknowledgePopoverAnchor,
      )
    })
  })

  describe('contentFocus popover wiring', () => {
    it('does not put tabindex on the popover panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).not.toHaveAttr('tabIndex'),
        acknowledgePopoverAnchor,
      )
    })

    it('does not attach a blur handler to the popover panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).not.toHaveHandler('blur'),
        acknowledgePopoverAnchor,
      )
    })

    it('still attaches a keydown handler to the popover panel for Escape', () => {
      // NOTE: Keydown events bubble, so the panel handler catches Escape
      // presses even though focus lives on the calendar grid (a descendant).
      // Removing this while retaining contentFocus would break Escape-to-close.
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toHaveHandler('keydown'),
        acknowledgePopoverAnchor,
      )
    })
  })

  describe('hidden form input', () => {
    it('does not render a hidden input when no name is provided', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel),
        Scene.expect(hiddenInput).toBeAbsent(),
      )
    })

    it('renders a hidden input with the name when provided', () => {
      Scene.scene(
        { update, view: sceneView({ name: 'dob' }) },
        Scene.with(closedModel),
        Scene.expect(hiddenInput).toExist(),
        Scene.expect(hiddenInput).toHaveAttr('name', 'dob'),
      )
    })

    it('emits an empty hidden input value when no date is selected', () => {
      Scene.scene(
        { update, view: sceneView({ name: 'dob' }) },
        Scene.with(closedModel),
        Scene.expect(hiddenInput).toHaveValue(''),
      )
    })

    it('encodes the selected date as ISO YYYY-MM-DD', () => {
      const seeded = init({
        id: 'picker',
        today,
        initialSelectedDate: Calendar.make(2026, 4, 5),
      })
      Scene.scene(
        { update, view: sceneView({ name: 'dob' }) },
        Scene.with(seeded),
        Scene.expect(hiddenInput).toHaveValue('2026-04-05'),
      )
    })

    it('pads single-digit months and days to two characters', () => {
      const seeded = init({
        id: 'picker',
        today,
        initialSelectedDate: Calendar.make(2026, 1, 9),
      })
      Scene.scene(
        { update, view: sceneView({ name: 'dob' }) },
        Scene.with(seeded),
        Scene.expect(hiddenInput).toHaveValue('2026-01-09'),
      )
    })
  })
})
