import { describe, it } from '@effect/vitest'
import { Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Calendar from '../../calendar/index.js'
import * as Story from '../../test/story.js'
import * as UiCalendar from '../calendar/index.js'
import * as Popover from '../popover/index.js'
import {
  ChangedViewMonth,
  Cleared,
  Closed,
  GotCalendarMessage,
  GotPopoverMessage,
  Opened,
  SelectedDate,
  clear,
  close,
  init,
  open,
  selectDate,
  setDisabledDates,
  setDisabledDaysOfWeek,
  setMaxDate,
  setMinDate,
  update,
} from './index.js'

const today = Calendar.make(2026, 4, 13)

const withClosed = Story.with(init({ id: 'picker', today }))

const withOpen = flow(withClosed, Story.message(Opened()))

describe('DatePicker', () => {
  describe('init', () => {
    it('defaults to no selected date and closed popover with contentFocus enabled', () => {
      const model = init({ id: 'picker', today })
      expect(model.id).toBe('picker')
      expect(model.maybeSelectedDate).toStrictEqual(Option.none())
      expect(model.popover.isOpen).toBe(false)
      expect(model.popover.contentFocus).toBe(true)
      expect(model.popover.id).toBe('picker-popover')
      expect(model.calendar.id).toBe('picker-calendar')
    })

    it('seeds the selection from initialSelectedDate', () => {
      const selected = Calendar.make(2026, 5, 2)
      const model = init({
        id: 'picker',
        today,
        initialSelectedDate: selected,
      })
      expect(model.maybeSelectedDate).toStrictEqual(Option.some(selected))
      expect(model.calendar.maybeSelectedDate).toStrictEqual(
        Option.some(selected),
      )
      expect(model.calendar.viewMonth).toBe(5)
    })

    it('propagates isAnimated to the popover submodel', () => {
      const model = init({ id: 'picker', today, isAnimated: true })
      expect(model.popover.isAnimated).toBe(true)
    })

    it('propagates min/max and disabled config to the calendar submodel', () => {
      const minDate = Calendar.make(2026, 1, 1)
      const maxDate = Calendar.make(2026, 12, 31)
      const model = init({
        id: 'picker',
        today,
        minDate,
        maxDate,
        disabledDaysOfWeek: ['Sunday'],
      })
      expect(model.calendar.maybeMinDate).toStrictEqual(Option.some(minDate))
      expect(model.calendar.maybeMaxDate).toStrictEqual(Option.some(maxDate))
      expect(model.calendar.disabledDaysOfWeek).toStrictEqual(['Sunday'])
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the popover', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened()),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('does not dispatch focus commands when opening', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened()),
          Story.expectNoCommands(),
        )
      })
    })

    describe('Closed', () => {
      it('closes the popover and returns focus to the trigger button', () => {
        Story.story(
          update,
          withOpen,
          Story.message(Closed()),
          Story.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
            message => GotPopoverMessage({ message }),
          ),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(false)
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('SelectedDate', () => {
      it('commits the date and closes the popover', () => {
        const target = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          withOpen,
          Story.message(SelectedDate({ date: target })),
          Story.expectNoOutMessage(),
          Story.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
            message => GotPopoverMessage({ message }),
          ),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.some(target))
            expect(model.calendar.maybeSelectedDate).toStrictEqual(
              Option.some(target),
            )
            expect(model.calendar.maybeFocusedDate).toStrictEqual(
              Option.some(target),
            )
            expect(model.popover.isOpen).toBe(false)
          }),
        )
      })

      it('syncs the calendar view month when the selection crosses a month boundary', () => {
        const target = Calendar.make(2026, 6, 5)
        Story.story(
          update,
          withOpen,
          Story.message(SelectedDate({ date: target })),
          Story.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
            message => GotPopoverMessage({ message }),
          ),
          Story.model(model => {
            expect(model.calendar.viewYear).toBe(2026)
            expect(model.calendar.viewMonth).toBe(6)
          }),
        )
      })
    })

    describe('Cleared', () => {
      it('clears the selected date without closing the popover', () => {
        const seeded = init({
          id: 'picker',
          today,
          initialSelectedDate: Calendar.make(2026, 4, 20),
        })
        Story.story(
          update,
          flow(Story.with(seeded), Story.message(Opened())),
          Story.message(Cleared()),
          Story.expectNoCommands(),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.none())
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('GotCalendarMessage', () => {
      it('propagates Calendar ChangedViewMonth as DatePicker ChangedViewMonth', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            GotCalendarMessage({
              message: UiCalendar.ClickedNextMonthButton(),
            }),
          ),
          Story.model(model => {
            expect(model.calendar.viewMonth).toBe(5)
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 5 })),
        )
      })

      it('passes keyboard navigation through to the calendar grid', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            GotCalendarMessage({
              message: UiCalendar.PressedKeyOnGrid({
                key: 'ArrowRight',
                isShift: false,
              }),
            }),
          ),
          Story.model(model => {
            expect(model.calendar.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 4, 14)),
            )
          }),
        )
      })
    })

    describe('GotPopoverMessage', () => {
      it('routes popover messages through the popover update', () => {
        Story.story(
          update,
          withOpen,
          Story.message(GotPopoverMessage({ message: Popover.Closed() })),
          Story.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
            message => GotPopoverMessage({ message }),
          ),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(false)
          }),
        )
      })
    })
  })

  describe('programmatic helpers', () => {
    it('open(model) behaves like dispatching Opened', () => {
      const model = init({ id: 'picker', today })
      const [nextModel] = open(model)
      expect(nextModel.popover.isOpen).toBe(true)
    })

    it('close(model) behaves like dispatching Closed', () => {
      const [openedModel] = open(init({ id: 'picker', today }))
      const [nextModel, commands] = close(openedModel)
      expect(nextModel.popover.isOpen).toBe(false)
      expect(commands.length).toBeGreaterThan(0)
    })

    it('selectDate(model, date) commits the date and closes the popover', () => {
      const target = Calendar.make(2026, 4, 20)
      const [openedModel] = open(init({ id: 'picker', today }))
      const [nextModel] = selectDate(openedModel, target)
      expect(nextModel.maybeSelectedDate).toStrictEqual(Option.some(target))
      expect(nextModel.popover.isOpen).toBe(false)
    })

    it('clear(model) clears the selected date', () => {
      const seeded = init({
        id: 'picker',
        today,
        initialSelectedDate: Calendar.make(2026, 4, 20),
      })
      const [nextModel] = clear(seeded)
      expect(nextModel.maybeSelectedDate).toStrictEqual(Option.none())
    })

    it('setMinDate(model, minDate) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const newMin = Calendar.make(2026, 5, 1)
      const next = setMinDate(model, Option.some(newMin))
      expect(next.calendar.maybeMinDate).toStrictEqual(Option.some(newMin))
    })

    it('setMinDate(model, Option.none()) clears the minimum', () => {
      const model = init({
        id: 'picker',
        today,
        minDate: Calendar.make(2026, 1, 1),
      })
      const next = setMinDate(model, Option.none())
      expect(next.calendar.maybeMinDate).toStrictEqual(Option.none())
    })

    it('setMaxDate(model, maxDate) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const newMax = Calendar.make(2026, 12, 31)
      const next = setMaxDate(model, Option.some(newMax))
      expect(next.calendar.maybeMaxDate).toStrictEqual(Option.some(newMax))
    })

    it('setDisabledDates(model, dates) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const disabled = [Calendar.make(2026, 4, 15)]
      const next = setDisabledDates(model, disabled)
      expect(next.calendar.disabledDates).toStrictEqual(disabled)
    })

    it('setDisabledDaysOfWeek(model, days) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const next = setDisabledDaysOfWeek(model, ['Saturday', 'Sunday'])
      expect(next.calendar.disabledDaysOfWeek).toStrictEqual([
        'Saturday',
        'Sunday',
      ])
    })

    it('setMinDate does not reconcile a previously-selected date below the new min', () => {
      const selected = Calendar.make(2026, 3, 15)
      const model = init({
        id: 'picker',
        today,
        initialSelectedDate: selected,
      })
      const newMin = Calendar.make(2026, 6, 1)
      const next = setMinDate(model, Option.some(newMin))
      expect(next.maybeSelectedDate).toStrictEqual(Option.some(selected))
      expect(next.calendar.maybeSelectedDate).toStrictEqual(
        Option.some(selected),
      )
    })
  })
})
