import { Option } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import * as Calendar from 'foldkit/calendar'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as UiCalendar from '../calendar/block.js'
import * as Popover from '../popover/block.js'
import {
  type DatePicker,
  DatePickerLive,
  Message,
  OutMessage,
} from './block.js'

const today = Calendar.make(2026, 4, 13)

const closed = { id: 'picker', today }

const deliverCalendarMessage = (
  message: typeof UiCalendar.Calendar.Message.Type,
) => Story.message(Block.deliver(UiCalendar.Calendar, 'calendar', message))

const deliverPopoverMessage = (message: typeof Popover.Popover.Message.Type) =>
  Story.message(Block.deliver(Popover.Popover, 'popover', message))

const resolveFocusGrid = Story.Command.resolve(
  UiCalendar.FocusGrid,
  UiCalendar.Message.CompletedFocusGrid(),
)

const resolveFocusPopoverButton = Story.Command.resolve(
  Popover.FocusPopoverButton,
  Popover.Message.CompletedFocusPopoverButton(),
)

const openSteps = Story.steps(Story.message(Message.Opened()))

const drillIntoYearsSteps = Story.steps(
  deliverCalendarMessage(UiCalendar.Message.ClickedHeading()),
  resolveFocusGrid,
  deliverCalendarMessage(UiCalendar.Message.ClickedHeading()),
  resolveFocusGrid,
  Story.model((model: Resolved<DatePicker>) => {
    expect(model.calendar.viewMode).toBe('Years')
  }),
)

describe('DatePicker', () => {
  describe('init', () => {
    it.effect('defaults to a closed popover with contentFocus enabled', () =>
      Story.story(
        DatePickerLive,
        closed,
        Story.model(model => {
          expect(model.id).toBe('picker')
          expect(model.popover.isOpen).toBe(false)
          expect(model.popover.contentFocus).toBe(true)
          expect(model.popover.id).toBe('picker-popover')
          expect(model.calendar.id).toBe('picker-calendar')
        }),
      ),
    )

    it.effect('seeds the calendar view month from initialViewDate', () =>
      Story.story(
        DatePickerLive,
        { id: 'picker', today, initialViewDate: Calendar.make(2026, 5, 2) },
        Story.model(model => {
          expect(model.calendar.viewMonth).toBe(5)
        }),
      ),
    )

    it.effect('propagates isAnimated to the popover', () =>
      Story.story(
        DatePickerLive,
        { id: 'picker', today, isAnimated: true },
        Story.model(model => {
          expect(model.popover.isAnimated).toBe(true)
        }),
      ),
    )

    it.effect('propagates min/max and disabled config to the calendar', () => {
      const minDate = Calendar.make(2026, 1, 1)
      const maxDate = Calendar.make(2026, 12, 31)
      return Story.story(
        DatePickerLive,
        {
          id: 'picker',
          today,
          minDate,
          maxDate,
          disabledDaysOfWeek: ['Sunday'],
        },
        Story.model(model => {
          expect(model.calendar.maybeMinDate).toStrictEqual(
            Option.some(minDate),
          )
          expect(model.calendar.maybeMaxDate).toStrictEqual(
            Option.some(maxDate),
          )
          expect(model.calendar.disabledDaysOfWeek).toStrictEqual(['Sunday'])
        }),
      )
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it.effect('opens the popover', () =>
        Story.story(
          DatePickerLive,
          closed,
          Story.message(Message.Opened()),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('does not dispatch focus commands when opening', () =>
        Story.story(
          DatePickerLive,
          closed,
          Story.message(Message.Opened()),
          Story.Command.expectNone(),
        ),
      )

      it.effect(
        'drops the calendar back to Days mode if a previous session left it drilled into Months or Years',
        () =>
          Story.story(
            DatePickerLive,
            closed,
            openSteps,
            drillIntoYearsSteps,
            Story.message(Message.Closed()),
            resolveFocusPopoverButton,
            Story.message(Message.Opened()),
            Story.model(model => {
              expect(model.calendar.viewMode).toBe('Days')
            }),
          ),
      )
    })

    describe('Closed', () => {
      it.effect(
        'closes the popover and returns focus to the trigger button',
        () =>
          Story.story(
            DatePickerLive,
            closed,
            openSteps,
            Story.message(Message.Closed()),
            resolveFocusPopoverButton,
            Story.model(model => {
              expect(model.popover.isOpen).toBe(false)
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect(
        'drops the calendar back to Days mode if the user closed while drilled into Months or Years',
        () =>
          Story.story(
            DatePickerLive,
            closed,
            openSteps,
            drillIntoYearsSteps,
            Story.message(Message.Closed()),
            resolveFocusPopoverButton,
            Story.model(model => {
              expect(model.calendar.viewMode).toBe('Days')
            }),
          ),
      )

      it.effect(
        'reconciles the calendar focus after Years-mode paging so reopening does not drift the day grid',
        () =>
          Story.story(
            DatePickerLive,
            closed,
            openSteps,
            drillIntoYearsSteps,
            deliverCalendarMessage(
              UiCalendar.Message.PagedYears({ direction: 1 }),
            ),
            Story.message(Message.Closed()),
            resolveFocusPopoverButton,
            Story.model(model => {
              expect(model.calendar.viewMode).toBe('Days')
              expect(model.calendar.viewYear).toBe(2026)
              expect(model.calendar.viewMonth).toBe(4)
              expect(model.calendar.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2026, 4, 13)),
              )
            }),
          ),
      )
    })

    describe('RequestedOpen', () => {
      it.effect('opens the popover', () =>
        Story.story(
          DatePickerLive,
          closed,
          Story.message(Message.RequestedOpen()),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('RequestedClose', () => {
      it.effect('closes the popover and returns focus to the trigger', () =>
        Story.story(
          DatePickerLive,
          closed,
          Story.message(Message.RequestedOpen()),
          Story.message(Message.RequestedClose()),
          Story.Command.expectExact(Popover.FocusPopoverButton),
          resolveFocusPopoverButton,
          Story.model(model => {
            expect(model.popover.isOpen).toBe(false)
          }),
        ),
      )
    })

    describe('RequestedSelectDate', () => {
      it.effect(
        'commits the date, closes the popover, and emits SelectedDate',
        () => {
          const target = Calendar.make(2026, 4, 20)
          return Story.story(
            DatePickerLive,
            closed,
            openSteps,
            Story.message(Message.RequestedSelectDate({ date: target })),
            Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
            resolveFocusPopoverButton,
            Story.model(model => {
              expect(model.calendar.maybeFocusedDate).toStrictEqual(
                Option.some(target),
              )
              expect(model.popover.isOpen).toBe(false)
            }),
          )
        },
      )

      it.effect(
        'syncs the calendar view month when the selection crosses a month boundary',
        () =>
          Story.story(
            DatePickerLive,
            closed,
            openSteps,
            Story.message(
              Message.RequestedSelectDate({ date: Calendar.make(2026, 6, 5) }),
            ),
            resolveFocusPopoverButton,
            Story.model(model => {
              expect(model.calendar.viewYear).toBe(2026)
              expect(model.calendar.viewMonth).toBe(6)
            }),
          ),
      )
    })

    describe('Cleared', () => {
      it.effect('emits ClearedDate without closing the popover', () =>
        Story.story(
          DatePickerLive,
          { id: 'picker', today, initialViewDate: Calendar.make(2026, 4, 20) },
          openSteps,
          Story.message(Message.Cleared()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.popover.isOpen).toBe(true)
          }),
          Story.expectOutMessage(OutMessage.ClearedDate()),
        ),
      )
    })

    describe('RequestedClear', () => {
      it.effect('emits ClearedDate', () =>
        Story.story(
          DatePickerLive,
          { id: 'picker', today, initialViewDate: Calendar.make(2026, 4, 20) },
          Story.message(Message.RequestedClear()),
          Story.expectOutMessage(OutMessage.ClearedDate()),
        ),
      )
    })

    describe('Calendar Messages', () => {
      it.effect(
        'propagates Calendar ChangedViewMonth as DatePicker ChangedViewMonth',
        () =>
          Story.story(
            DatePickerLive,
            closed,
            openSteps,
            deliverCalendarMessage(UiCalendar.Message.ClickedNextMonthButton()),
            Story.model(model => {
              expect(model.calendar.viewMonth).toBe(5)
            }),
            Story.expectOutMessage(
              OutMessage.ChangedViewMonth({ year: 2026, month: 5 }),
            ),
          ),
      )

      it.effect('passes keyboard navigation through to the calendar grid', () =>
        Story.story(
          DatePickerLive,
          closed,
          openSteps,
          deliverCalendarMessage(
            UiCalendar.Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.calendar.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 4, 14)),
            )
          }),
        ),
      )
    })

    describe('Popover Messages', () => {
      it.effect('routes popover messages through the popover update', () =>
        Story.story(
          DatePickerLive,
          closed,
          openSteps,
          deliverPopoverMessage(Popover.Message.RequestedClose()),
          resolveFocusPopoverButton,
          Story.model(model => {
            expect(model.popover.isOpen).toBe(false)
          }),
        ),
      )
    })

    describe('InformedOfMinDateChange', () => {
      it.effect('forwards a new minimum to the embedded calendar', () => {
        const newMin = Calendar.make(2026, 5, 1)
        return Story.story(
          DatePickerLive,
          closed,
          Story.message(
            Message.InformedOfMinDateChange({
              maybeMinDate: Option.some(newMin),
            }),
          ),
          Story.model(model => {
            expect(model.calendar.maybeMinDate).toStrictEqual(
              Option.some(newMin),
            )
          }),
        )
      })

      it.effect('clears the minimum', () =>
        Story.story(
          DatePickerLive,
          { id: 'picker', today, minDate: Calendar.make(2026, 1, 1) },
          Story.message(
            Message.InformedOfMinDateChange({ maybeMinDate: Option.none() }),
          ),
          Story.model(model => {
            expect(model.calendar.maybeMinDate).toStrictEqual(Option.none())
          }),
        ),
      )
    })

    describe('InformedOfMaxDateChange', () => {
      it.effect('forwards a new maximum to the embedded calendar', () => {
        const newMax = Calendar.make(2026, 12, 31)
        return Story.story(
          DatePickerLive,
          closed,
          Story.message(
            Message.InformedOfMaxDateChange({
              maybeMaxDate: Option.some(newMax),
            }),
          ),
          Story.model(model => {
            expect(model.calendar.maybeMaxDate).toStrictEqual(
              Option.some(newMax),
            )
          }),
        )
      })
    })

    describe('InformedOfDisabledDatesChange', () => {
      it.effect('forwards disabled dates to the embedded calendar', () => {
        const disabled = [Calendar.make(2026, 4, 15)]
        return Story.story(
          DatePickerLive,
          closed,
          Story.message(
            Message.InformedOfDisabledDatesChange({ disabledDates: disabled }),
          ),
          Story.model(model => {
            expect(model.calendar.disabledDates).toStrictEqual(disabled)
          }),
        )
      })
    })

    describe('InformedOfDisabledDaysOfWeekChange', () => {
      it.effect('forwards disabled days of week to the embedded calendar', () =>
        Story.story(
          DatePickerLive,
          closed,
          Story.message(
            Message.InformedOfDisabledDaysOfWeekChange({
              disabledDaysOfWeek: ['Saturday', 'Sunday'],
            }),
          ),
          Story.model(model => {
            expect(model.calendar.disabledDaysOfWeek).toStrictEqual([
              'Saturday',
              'Sunday',
            ])
          }),
        ),
      )
    })

    describe('RequestedFocusDate', () => {
      it.effect('moves the embedded calendar view and cursor to a date', () => {
        const date = Calendar.make(2026, 8, 15)
        return Story.story(
          DatePickerLive,
          closed,
          Story.message(Message.RequestedFocusDate({ date })),
          Story.model(model => {
            expect(model.calendar.viewYear).toBe(2026)
            expect(model.calendar.viewMonth).toBe(8)
            expect(model.calendar.maybeFocusedDate).toStrictEqual(
              Option.some(date),
            )
          }),
        )
      })
    })
  })
})
