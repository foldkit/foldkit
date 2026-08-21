import { Match as M, Option } from 'effect'
import * as Calendar from 'foldkit/calendar'
import { type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as UiCalendar from '../calendar/index.js'
import * as Popover from '../popover/public.js'
import type { Model, ViewInputs } from './index.js'
import { Message, init, triggerId, update, view } from './index.js'

const acknowledgeAnchorPopover = Scene.Mount.resolve(
  Popover.AnchorPopover,
  Popover.Message.CompletedAnchorPopover(),
)
const acknowledgePopoverBackdrop = Scene.Mount.resolve(
  Popover.PortalPopoverBackdrop,
  Popover.Message.CompletedPortalPopoverBackdrop(),
)

const today = Calendar.make(2026, 4, 13)

const testToCalendarView = (attrs: UiCalendar.CalendarAttributes) =>
  M.value(attrs).pipe(
    M.tagsExhaustive({
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

const sceneView =
  (
    overrides: Omit<
      Partial<ViewInputs>,
      'anchor' | 'triggerContent' | 'toCalendarView'
    > = {},
  ) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      model,
      {
        anchor: { placement: 'bottom-start' },
        maybeSelectedDate: Option.none(),
        triggerContent,
        toCalendarView: testToCalendarView,
        ...overrides,
      },
      h,
    )

const trigger = Scene.selector('#picker-popover-button')
const panel = Scene.selector('#picker-popover-panel')
const grid = Scene.role('grid')
const hiddenInput = Scene.selector('input[type="hidden"]')

const closedModel = init({ id: 'picker', today })
const updateResult = update(closedModel, Message.Opened())

describe('DatePicker', () => {
  describe('rendering', () => {
    it('renders the trigger button with type=button and default aria-expanded false', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel),
        Scene.expect(trigger).toExist(),
        Scene.expect(trigger).toHaveAttr('type', 'button'),
        Scene.expect(trigger).toHaveAttr('aria-expanded', 'false'),
      )
    })

    it('renders the trigger placeholder text when no date is selected', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel),
        Scene.expect(trigger).toHaveText('Pick a date'),
      )
    })

    it('renders the trigger with the selected date when one is set', () => {
      const selected = Calendar.make(2026, 4, 20)
      Scene.scene(
        {
          update,
          view: sceneView({ maybeSelectedDate: Option.some(selected) }),
        },
        Scene.given(closedModel),
        Scene.expect(trigger).toHaveText('2026-4-20'),
      )
    })

    it('does not render the calendar grid when the popover is closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel),
        Scene.expect(grid).toBeAbsent(),
      )
    })

    it('renders the calendar grid inside the popover panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(updateResult.model),
        Scene.expect(panel).toExist(),
        Scene.expect(grid).toExist(),
        acknowledgeAnchorPopover,
        acknowledgePopoverBackdrop,
      )
    })
  })

  describe('contentFocus popover wiring', () => {
    it('does not put tabindex on the popover panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(updateResult.model),
        Scene.expect(panel).not.toHaveAttr('tabIndex'),
        acknowledgeAnchorPopover,
        acknowledgePopoverBackdrop,
      )
    })

    it('does not attach a blur handler to the popover panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(updateResult.model),
        Scene.expect(panel).not.toHaveHandler('blur'),
        acknowledgeAnchorPopover,
        acknowledgePopoverBackdrop,
      )
    })

    it('still attaches a keydown handler to the popover panel for Escape', () => {
      // NOTE: Keydown events bubble, so the panel handler catches Escape
      // presses even though focus lives on the calendar grid (a descendant).
      // Removing this while retaining contentFocus would break Escape-to-close.
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(updateResult.model),
        Scene.expect(panel).toHaveHandler('keydown'),
        acknowledgeAnchorPopover,
        acknowledgePopoverBackdrop,
      )
    })
  })

  describe('hidden form input', () => {
    it('does not render a hidden input when no name is provided', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel),
        Scene.expect(hiddenInput).toBeAbsent(),
      )
    })

    it('renders a hidden input with the name when provided', () => {
      Scene.scene(
        { update, view: sceneView({ name: 'dob' }) },
        Scene.given(closedModel),
        Scene.expect(hiddenInput).toExist(),
        Scene.expect(hiddenInput).toHaveAttr('name', 'dob'),
      )
    })

    it('emits an empty hidden input value when no date is selected', () => {
      Scene.scene(
        { update, view: sceneView({ name: 'dob' }) },
        Scene.given(closedModel),
        Scene.expect(hiddenInput).toHaveValue(''),
      )
    })

    it('encodes the selected date as ISO YYYY-MM-DD', () => {
      const selected = Calendar.make(2026, 4, 5)
      Scene.scene(
        {
          update,
          view: sceneView({
            name: 'dob',
            maybeSelectedDate: Option.some(selected),
          }),
        },
        Scene.given(closedModel),
        Scene.expect(hiddenInput).toHaveValue('2026-04-05'),
      )
    })

    it('pads single-digit months and days to two characters', () => {
      const selected = Calendar.make(2026, 1, 9)
      Scene.scene(
        {
          update,
          view: sceneView({
            name: 'dob',
            maybeSelectedDate: Option.some(selected),
          }),
        },
        Scene.given(closedModel),
        Scene.expect(hiddenInput).toHaveValue('2026-01-09'),
      )
    })
  })

  describe('trigger labeling', () => {
    it('no aria-label or aria-labelledby on the trigger by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(closedModel),
        Scene.expect(trigger).not.toHaveAttr('aria-label'),
        Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-label to the trigger when ariaLabel is provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabel: 'Due date' }) },
        Scene.given(closedModel),
        Scene.expect(trigger).toHaveAttr('aria-label', 'Due date'),
        Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-labelledby to the trigger when ariaLabelledBy is provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabelledBy: 'due-label' }) },
        Scene.given(closedModel),
        Scene.expect(trigger).toHaveAttr('aria-labelledby', 'due-label'),
        Scene.expect(trigger).not.toHaveAttr('aria-label'),
      )
    })

    it('prefers aria-label over aria-labelledby when both are provided', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            ariaLabel: 'Due date',
            ariaLabelledBy: 'due-label',
          }),
        },
        Scene.given(closedModel),
        Scene.expect(trigger).toHaveAttr('aria-label', 'Due date'),
        Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('triggerId derives the trigger id from the base id', () => {
      expect(triggerId('picker')).toBe('picker-popover-button')
    })
  })
})
