import { Option, flow } from 'effect'
import * as Calendar from 'foldkit/calendar'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as UiCalendar from '../calendar/index.js'
import * as Popover from '../popover/index.js'
import {
  Message,
  OutMessage,
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

const givenClosed = Story.given(init({ id: 'picker', today }))

const givenOpen = flow(givenClosed, Story.message(Message.Opened()))

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
          givenClosed,
          Story.message(Message.Opened()),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('does not dispatch focus commands when opening', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.Opened()),
          Story.Command.expectNone(),
        )
      })

      it('drops the calendar back to Days mode if a previous session left it drilled into Months or Years', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedHeading(),
            }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.Message.CompletedFocusGrid(),
          ),
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedHeading(),
            }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.Message.CompletedFocusGrid(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Years')
          }),
          Story.message(Message.Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
          ),
          Story.message(Message.Opened()),
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
          givenOpen,
          Story.message(Message.Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
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
          givenOpen,
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedHeading(),
            }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.Message.CompletedFocusGrid(),
          ),
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedHeading(),
            }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.Message.CompletedFocusGrid(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Years')
          }),
          Story.message(Message.Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
          ),
          Story.model(model => {
            expect(model.calendar.viewMode).toBe('Days')
          }),
        )
      })

      it('reconciles the calendar focus after Years-mode paging so reopening does not drift the day grid', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedHeading(),
            }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.Message.CompletedFocusGrid(),
          ),
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedHeading(),
            }),
          ),
          Story.Command.resolve(
            UiCalendar.FocusGrid,
            UiCalendar.Message.CompletedFocusGrid(),
          ),
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.PagedYears({ direction: 1 }),
            }),
          ),
          Story.message(Message.Closed()),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
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
          givenOpen,
          Story.message(Message.RequestedSelectDate({ date: target })),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
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
          givenOpen,
          Story.message(Message.RequestedSelectDate({ date: target })),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
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
          flow(Story.given(seeded), Story.message(Message.Opened())),
          Story.message(Message.Cleared()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectOutMessage(OutMessage.ClearedDate()),
        )
      })
    })

    describe('GotCalendarMessage', () => {
      it('propagates Calendar ChangedViewMonth as DatePicker ChangedViewMonth', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.ClickedNextMonthButton(),
            }),
          ),
          Story.model(model => {
            expect(model.calendar.viewMonth).toBe(5)
          }),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 5 }),
          ),
        )
      })

      it('passes keyboard navigation through to the calendar grid', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(
            Message.GotCalendarMessage({
              message: UiCalendar.Message.PressedKeyOnGrid({
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
          givenOpen,
          Story.message(
            Message.GotPopoverMessage({
              message: Popover.Message.RequestedClose(),
            }),
          ),
          Story.Command.resolve(
            Popover.FocusButton,
            Popover.Message.CompletedFocusButton(),
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
      const openResult = open(model)
      expect(openResult.model.popover.isOpen).toBe(true)
    })

    it('close(model) behaves like dispatching Closed', () => {
      const openResult = open(init({ id: 'picker', today }))
      const closeResult = close(openResult.model)
      expect(closeResult.model.popover.isOpen).toBe(false)
      expect((closeResult.commands ?? []).length).toBeGreaterThan(0)
    })

    it('selectDate(model, date) commits the date, closes the popover, and emits SelectedDate', () => {
      const target = Calendar.make(2026, 4, 20)
      const openResult = open(init({ id: 'picker', today }))
      const selectDateResult = selectDate(openResult.model, target)
      expect(selectDateResult.model.popover.isOpen).toBe(false)
      expect(selectDateResult.outMessage).toStrictEqual(
        OutMessage.SelectedDate({ date: target }),
      )
    })

    it('clear(model) emits ClearedDate', () => {
      const seeded = init({
        id: 'picker',
        today,
        initialViewDate: Calendar.make(2026, 4, 20),
      })
      const clearResult = clear(seeded)
      expect(clearResult.outMessage).toStrictEqual(OutMessage.ClearedDate())
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
