import { Option, flow } from 'effect'
import * as Calendar from 'foldkit/calendar'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as UiCalendar from '../calendar/index.js'
import * as Popover from '../popover/index.js'
import {
  ChangedViewMonth,
  Cleared,
  ClearedDate,
  Closed,
  GotCalendarMessage,
  GotPopoverMessage,
  Opened,
  RequestedSelectDate,
  SelectedDate,
  clear,
  close,
  focusDate,
  init,
  open,
  reflectDisabledDates,
  reflectDisabledDaysOfWeek,
  reflectMaxDate,
  reflectMinDate,
  selectDate,
  update,
} from './index.js'

const today = Calendar.make(2026, 4, 13)

const withClosed = Story.with(init({ id: 'picker', today }))

const withOpen = flow(withClosed, Story.message(Opened()))

describe('DatePicker', () => {
  describe('init', () => {
    it('defaults to a closed popover with contentFocus enabled', () => {
      const model = init({ id: 'picker', today })
      expect(model.id).toBe('picker')
      expect(model.popover.isOpen).toBe(false)
      expect(model.popover.contentFocus).toBe(true)
      expect(model.popover.id).toBe('picker-popover')
      expect(model.calendar.id).toBe('picker-calendar')
    })

    it('seeds the calendar view month from initialViewDate', () => {
      const initialViewDate = Calendar.make(2026, 5, 2)
      const model = init({
        id: 'picker',
        today,
        initialViewDate,
      })
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
          Story.Command.expectNone(),
        )
      })

      it('drops the calendar back to Days mode if a previous session left it drilled into Months or Years', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            GotCalendarMessage({ message: UiCalendar.ClickedHeading() }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.CompletedFocusGrid(),
          ),
          Story.message(
            GotCalendarMessage({ message: UiCalendar.ClickedHeading() }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.CompletedFocusGrid(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Years')
          }),
          Story.message(Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
          ),
          Story.message(Opened()),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Days')
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the popover and returns focus to the trigger button', () => {
        Story.story(
          update,
          withOpen,
          Story.message(Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
          ),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(false)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('drops the calendar back to Days mode if the user closed while drilled into Months or Years', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            GotCalendarMessage({ message: UiCalendar.ClickedHeading() }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.CompletedFocusGrid(),
          ),
          Story.message(
            GotCalendarMessage({ message: UiCalendar.ClickedHeading() }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.CompletedFocusGrid(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Years')
          }),
          Story.message(Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Days')
          }),
        )
      })

      it('reconciles the calendar focus after Years-mode paging so reopening does not drift the day grid', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            GotCalendarMessage({ message: UiCalendar.ClickedHeading() }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.CompletedFocusGrid(),
          ),
          Story.message(
            GotCalendarMessage({ message: UiCalendar.ClickedHeading() }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.CompletedFocusGrid(),
          ),
          Story.message(
            GotCalendarMessage({
              message: UiCalendar.PagedYears({ direction: 1 }),
            }),
          ),
          Story.message(Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Days')
            expect(model.calendar.viewYear).toBe(2026)
            expect(model.calendar.viewMonth).toBe(4)
            expect(model.calendar.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 4, 13)),
            )
          }),
        )
      })
    })

    describe('RequestedSelectDate', () => {
      it('commits the date, closes the popover, and emits SelectedDate', () => {
        const target = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          withOpen,
          Story.message(RequestedSelectDate({ date: target })),
          Story.expectOutMessage(SelectedDate({ date: target })),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
          ),
          Story.model(model => {
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
          Story.message(RequestedSelectDate({ date: target })),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
          ),
          Story.model(model => {
            expect(model.calendar.viewYear).toBe(2026)
            expect(model.calendar.viewMonth).toBe(6)
          }),
        )
      })
    })

    describe('Cleared', () => {
      it('emits ClearedDate without closing the popover', () => {
        const seeded = init({
          id: 'picker',
          today,
          initialViewDate: Calendar.make(2026, 4, 20),
        })
        Story.story(
          update,
          flow(Story.with(seeded), Story.message(Opened())),
          Story.message(Cleared()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectOutMessage(ClearedDate()),
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
          Story.message(
            GotPopoverMessage({ message: Popover.RequestedClose() }),
          ),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.CompletedFocusButton(),
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

    it('selectDate(model, date) commits the date, closes the popover, and emits SelectedDate', () => {
      const target = Calendar.make(2026, 4, 20)
      const [openedModel] = open(init({ id: 'picker', today }))
      const [nextModel, , maybeOutMessage] = selectDate(openedModel, target)
      expect(nextModel.popover.isOpen).toBe(false)
      expect(maybeOutMessage).toStrictEqual(
        Option.some(SelectedDate({ date: target })),
      )
    })

    it('clear(model) emits ClearedDate', () => {
      const seeded = init({
        id: 'picker',
        today,
        initialViewDate: Calendar.make(2026, 4, 20),
      })
      const [, , maybeOutMessage] = clear(seeded)
      expect(maybeOutMessage).toStrictEqual(Option.some(ClearedDate()))
    })

    it('reflectMinDate(model, minDate) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const newMin = Calendar.make(2026, 5, 1)
      const next = reflectMinDate(model, Option.some(newMin))
      expect(next.calendar.maybeMinDate).toStrictEqual(Option.some(newMin))
    })

    it('reflectMinDate(model, Option.none()) clears the minimum', () => {
      const model = init({
        id: 'picker',
        today,
        minDate: Calendar.make(2026, 1, 1),
      })
      const next = reflectMinDate(model, Option.none())
      expect(next.calendar.maybeMinDate).toStrictEqual(Option.none())
    })

    it('reflectMaxDate(model, maxDate) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const newMax = Calendar.make(2026, 12, 31)
      const next = reflectMaxDate(model, Option.some(newMax))
      expect(next.calendar.maybeMaxDate).toStrictEqual(Option.some(newMax))
    })

    it('reflectDisabledDates(model, dates) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const disabled = [Calendar.make(2026, 4, 15)]
      const next = reflectDisabledDates(model, disabled)
      expect(next.calendar.disabledDates).toStrictEqual(disabled)
    })

    it('reflectDisabledDaysOfWeek(model, days) forwards to the embedded calendar', () => {
      const model = init({ id: 'picker', today })
      const next = reflectDisabledDaysOfWeek(model, ['Saturday', 'Sunday'])
      expect(next.calendar.disabledDaysOfWeek).toStrictEqual([
        'Saturday',
        'Sunday',
      ])
    })
  })

  describe('focusDate', () => {
    it('moves the embedded calendar view and cursor to a date', () => {
      const date = Calendar.make(2026, 8, 15)
      const next = focusDate(init({ id: 'picker', today }), date)
      expect(next.calendar.viewYear).toBe(2026)
      expect(next.calendar.viewMonth).toBe(8)
      expect(next.calendar.maybeFocusedDate).toStrictEqual(Option.some(date))
    })
  })
})
