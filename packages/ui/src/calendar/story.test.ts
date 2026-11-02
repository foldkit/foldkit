import { Effect, Option } from 'effect'
import * as Calendar from 'foldkit/calendar'
import * as Story from 'foldkit/story'
import { it as baseIt, expect } from 'vitest'

import { describe } from '@effect/vitest'

import {
  FocusGrid,
  InMessage,
  Message,
  type Model,
  OutMessage,
  block,
} from './block.js'

const today = Calendar.make(2026, 4, 13)

const resolveFocusGrid = Story.Command.resolve(
  FocusGrid,
  Message.CompletedFocusGrid(),
)

const it = baseIt.extend<{ calendar: Story.TestBlock<typeof block> }>({
  calendar: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(block, calendar => Effect.promise(() => use(calendar))),
    ),
})

describe('Calendar', () => {
  describe('init', () => {
    it('defaults the view to today when no initial date is provided', ({
      calendar: { init },
    }) => {
      const model = init({ id: 'test', today }).model
      expect(model.viewYear).toBe(2026)
      expect(model.viewMonth).toBe(4)
      expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
      expect(model.isGridFocused).toBe(false)
    })

    it('sets the view to the month of the initial view date', ({
      calendar: { init },
    }) => {
      const initialViewDate = Calendar.make(2026, 8, 22)
      const model = init({
        id: 'test',
        today,
        initialViewDate,
      }).model
      expect(model.viewYear).toBe(2026)
      expect(model.viewMonth).toBe(8)
      expect(model.maybeFocusedDate).toStrictEqual(Option.some(initialViewDate))
    })

    it('carries locale, min/max, and disabled configuration', ({
      calendar: { init },
    }) => {
      const minDate = Calendar.make(2026, 1, 1)
      const maxDate = Calendar.make(2026, 12, 31)
      const model = init({
        id: 'test',
        today,
        minDate,
        maxDate,
        disabledDaysOfWeek: ['Sunday'],
      }).model
      expect(model.maybeMinDate).toStrictEqual(Option.some(minDate))
      expect(model.maybeMaxDate).toStrictEqual(Option.some(maxDate))
      expect(model.disabledDaysOfWeek).toStrictEqual(['Sunday'])
    })
  })

  describe('update', () => {
    describe('ClickedDay', () => {
      it('commits the clicked date to internal state and emits SelectedDate', ({
        calendar: { update, init },
      }) => {
        const target = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(target))
          }),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
        )
      })

      it('syncs view month and emits SelectedDate when clicking into a different month', ({
        calendar: { update, init },
      }) => {
        const target = Calendar.make(2026, 6, 5)
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(6)
          }),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
        )
      })

      it('ignores clicks on dates before minDate', ({
        calendar: { update, init },
      }) => {
        const target = Calendar.make(2026, 4, 10)
        const minDate = Calendar.make(2026, 4, 15)
        Story.story(
          update,
          Story.given(init({ id: 'test', today, minDate }).model),
          Story.message(Message.ClickedDay({ date: target })),
          Story.expectNoOutMessage(),
        )
      })

      it('ignores clicks on dates matching a disabled day-of-week', ({
        calendar: { update, init },
      }) => {
        // 2026-04-19 is a Sunday
        const target = Calendar.make(2026, 4, 19)
        Story.story(
          update,
          Story.given(
            init({ id: 'test', today, disabledDaysOfWeek: ['Sunday'] }).model,
          ),
          Story.message(Message.ClickedDay({ date: target })),
          Story.expectNoOutMessage(),
        )
      })

      it('ignores clicks on explicitly disabled dates', ({
        calendar: { update, init },
      }) => {
        const target = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          Story.given(
            init({ id: 'test', today, disabledDates: [target] }).model,
          ),
          Story.message(Message.ClickedDay({ date: target })),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PressedKeyOnGrid', () => {
      const expectFocus = (expected: Calendar.CalendarDate) =>
        Story.model((model: Model) => {
          expect(model.maybeFocusedDate).toStrictEqual(Option.some(expected))
        })

      it('ArrowLeft moves focus back one day', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowLeft',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 12)),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowRight moves focus forward one day', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 14)),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowUp moves focus back one week', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'ArrowUp', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 4, 6)),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowDown moves focus forward one week', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowDown',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 20)),
          Story.expectNoOutMessage(),
        )
      })

      it('Home moves focus to the start of the week (Sunday locale)', ({
        calendar: { update, init },
      }) => {
        // 2026-04-13 is a Monday; Sunday-start week begins 2026-04-12
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'Home', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 4, 12)),
        )
      })

      it('End moves focus to the end of the week (Sunday locale)', ({
        calendar: { update, init },
      }) => {
        // 2026-04-13 is a Monday; Sunday-start week ends 2026-04-18 (Saturday)
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'End', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 4, 18)),
        )
      })

      it('PageUp moves focus back one month', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageUp', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 3, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 3 }),
          ),
        )
      })

      it('PageDown moves focus forward one month', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'PageDown',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 5, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 5 }),
          ),
        )
      })

      it('Shift+PageUp moves focus back one year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageUp', isShift: true }),
          ),
          expectFocus(Calendar.make(2025, 4, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2025, month: 4 }),
          ),
        )
      })

      it('Shift+PageDown moves focus forward one year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageDown', isShift: true }),
          ),
          expectFocus(Calendar.make(2027, 4, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2027, month: 4 }),
          ),
        )
      })

      it('Enter commits the focused date and emits SelectedDate', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'Enter', isShift: false }),
          ),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: today })),
        )
      })

      it('Space commits the focused date and emits SelectedDate', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.PressedKeyOnGrid({ key: ' ', isShift: false })),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: today })),
        )
      })

      it('crossing a month boundary updates the view and emits ChangedViewMonth', ({
        calendar: { update, init },
      }) => {
        // Focus on April 1, 2026 (Wednesday); ArrowLeft goes to March 31
        const startOfMonth = Calendar.make(2026, 4, 1)
        Story.story(
          update,
          Story.given(
            init({
              id: 'test',
              today,
              initialViewDate: startOfMonth,
            }).model,
          ),
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowLeft',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(3)
          }),
          expectFocus(Calendar.make(2026, 3, 31)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 3 }),
          ),
        )
      })

      it('Enter on a disabled date is a no-op', ({
        calendar: { update, init },
      }) => {
        // minDate excludes today, so the cursor lands on a disabled date
        const minDate = Calendar.make(2026, 5, 1)
        Story.story(
          update,
          Story.given(init({ id: 'test', today, minDate }).model),
          Story.message(
            Message.PressedKeyOnGrid({ key: 'Enter', isShift: false }),
          ),
          Story.expectNoOutMessage(),
        )
      })

      it('skips disabled days during arrow navigation', ({
        calendar: { update, init },
      }) => {
        // Disable the next day (2026-04-14); ArrowRight should skip to 2026-04-15
        const disabled = Calendar.make(2026, 4, 14)
        Story.story(
          update,
          Story.given(
            init({ id: 'test', today, disabledDates: [disabled] }).model,
          ),
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 15)),
        )
      })

      it('unknown keys are no-ops', ({ calendar: { update, init } }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.PressedKeyOnGrid({ key: 'x', isShift: false })),
          expectFocus(today),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )
      })
    })

    describe('ClickedPreviousMonthButton', () => {
      it('decrements the view month and moves focus to the same day in the new month', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedPreviousMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(3)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 3, 13)),
            )
          }),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 3 }),
          ),
        )
      })

      it('rolls the year back when navigating from January', ({
        calendar: { update, init },
      }) => {
        const januaryToday = Calendar.make(2026, 1, 15)
        Story.story(
          update,
          Story.given(init({ id: 'test', today: januaryToday }).model),
          Story.message(Message.ClickedPreviousMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2025)
            expect(model.viewMonth).toBe(12)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 12, 15)),
            )
          }),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2025, month: 12 }),
          ),
        )
      })
    })

    describe('ClickedNextMonthButton', () => {
      it('increments the view month and moves focus to the same day in the new month', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedNextMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(5)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 5, 13)),
            )
          }),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 5 }),
          ),
        )
      })

      it('rolls the year forward when navigating from December', ({
        calendar: { update, init },
      }) => {
        const decemberToday = Calendar.make(2026, 12, 15)
        Story.story(
          update,
          Story.given(init({ id: 'test', today: decemberToday }).model),
          Story.message(Message.ClickedNextMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2027)
            expect(model.viewMonth).toBe(1)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2027, 1, 15)),
            )
          }),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2027, month: 1 }),
          ),
        )
      })

      it('clamps focus day-of-month when the day does not exist in the new month', ({
        calendar: { update, init },
      }) => {
        const januaryEnd = Calendar.make(2026, 1, 31)
        Story.story(
          update,
          Story.given(init({ id: 'test', today: januaryEnd }).model),
          Story.message(Message.ClickedNextMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(2)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 2, 28)),
            )
          }),
        )
      })
    })

    describe('SelectedMonth', () => {
      it('jumps to the selected month, transitions to Days, and moves focus to the same day in the new month', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.SelectedMonth({ month: 9 })),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 9 }),
          ),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Days')
            expect(model.viewMonth).toBe(9)
            expect(model.viewYear).toBe(2026)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 9, 13)),
            )
          }),
        )
      })

      it('drills back to Days without emitting ChangedViewMonth when the selected month matches the current view month', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.SelectedMonth({ month: 4 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Days')
            expect(model.viewMonth).toBe(4)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('is a no-op when the selected month is fully disabled by maxDate', ({
        calendar: { update, init },
      }) => {
        const maxDate = Calendar.make(2026, 4, 30)
        Story.story(
          update,
          Story.given(init({ id: 'test', today, maxDate }).model),
          Story.message(Message.SelectedMonth({ month: 9 })),
          Story.model(model => {
            expect(model.viewMonth).toBe(4)
            expect(model.viewMode).toBe('Days')
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('SelectedYear', () => {
      it('jumps to the selected year and moves focus to the same day in that year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.SelectedYear({ year: 2030 })),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2030, month: 4 }),
          ),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewYear).toBe(2030)
            expect(model.viewMonth).toBe(4)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2030, 4, 13)),
            )
          }),
        )
      })

      it('transitions the calendar to Months mode after selecting a year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.SelectedYear({ year: 2030 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
        )
      })

      it('is a no-op when the selected year is below minDate', ({
        calendar: { update, init },
      }) => {
        const minDate = Calendar.make(2020, 1, 1)
        Story.story(
          update,
          Story.given(init({ id: 'test', today, minDate }).model),
          Story.message(Message.SelectedYear({ year: 2018 })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMode).toBe('Days')
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('ClickedHeading', () => {
      it('transitions Days to Months', ({ calendar: { update, init } }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('transitions Months to Years', ({ calendar: { update, init } }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('is a no-op in Years mode (terminal)', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
        )
      })
    })

    describe('PressedKeyOnGrid in Months mode', () => {
      it('ArrowLeft moves the focused month back by 1', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowLeft',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 3, 13)),
            )
          }),
        )
      })

      it('ArrowRight moves the focused month forward by 1', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 5, 13)),
            )
          }),
        )
      })

      it('ArrowUp moves the focused month back by one row (3 months)', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({ key: 'ArrowUp', isShift: false }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 1, 13)),
            )
          }),
        )
      })

      it('ArrowDown moves the focused month forward by one row (3 months)', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowDown',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 7, 13)),
            )
          }),
        )
      })

      it('ArrowLeft at January wraps backward to December of prior year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(
            init({ id: 'test', today: Calendar.make(2026, 1, 15) }).model,
          ),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowLeft',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 12, 15)),
            )
          }),
        )
      })

      it('PageUp moves the focused month back by one year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageUp', isShift: false }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 4, 13)),
            )
          }),
        )
      })

      it('PageDown moves the focused month forward by one year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'PageDown',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2027, 4, 13)),
            )
          }),
        )
      })

      it('unknown keys are no-ops in Months mode', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.PressedKeyOnGrid({ key: 'a', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PressedKeyOnGrid in Years mode', () => {
      it('arrow nav moves the cursor without changing viewYear (the selection)', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2027, 4, 13)),
            )
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowLeft moves the cursor back by 1 year', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowLeft',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 4, 13)),
            )
          }),
        )
      })

      it('ArrowUp moves the cursor back by one row (3 years)', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({ key: 'ArrowUp', isShift: false }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2023, 4, 13)),
            )
          }),
        )
      })

      it('PageDown advances the cursor by one window (12 years)', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'PageDown',
              isShift: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2038, 4, 13)),
            )
          }),
        )
      })

      it('unknown keys are no-ops in Years mode', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.PressedKeyOnGrid({ key: 'a', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PagedYears', () => {
      it('shifts the cursor forward by 12 years with direction +1, leaving viewYear untouched', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.PagedYears({ direction: 1 })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2038, 4, 13)),
            )
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('shifts the cursor backward by 12 years with direction -1, leaving viewYear untouched', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.PagedYears({ direction: -1 })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2014, 4, 13)),
            )
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('full year-jump flow', () => {
      it('Days → Months → Years → SelectedYear → SelectedMonth → Days', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
          Story.message(Message.SelectedYear({ year: 2020 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
            expect(model.viewYear).toBe(2020)
          }),
          Story.message(Message.SelectedMonth({ month: 3 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Days')
            expect(model.viewYear).toBe(2020)
            expect(model.viewMonth).toBe(3)
          }),
        )
      })
    })

    describe('FocusedGrid / BlurredGrid', () => {
      it('FocusedGrid sets isGridFocused to true', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.FocusedGrid()),
          Story.model(model => {
            expect(model.isGridFocused).toBe(true)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('BlurredGrid sets isGridFocused to false', ({
        calendar: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.FocusedGrid()),
          Story.message(Message.BlurredGrid()),
          Story.model(model => {
            expect(model.isGridFocused).toBe(false)
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('RefreshedToday', () => {
      it('updates the today field', ({ calendar: { update, init } }) => {
        const newToday = Calendar.make(2026, 4, 14)
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.RefreshedToday({ today: newToday })),
          Story.model(model => {
            expect(model.today).toStrictEqual(newToday)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('does not move the focus cursor', ({ calendar: { update, init } }) => {
        const newToday = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          Story.given(init({ id: 'test', today }).model),
          Story.message(Message.RefreshedToday({ today: newToday })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
        )
      })
    })
  })

  describe('programmatic setters', () => {
    describe('dropToDays', () => {
      it('returns the calendar to Days mode from Months mode', ({
        calendar: { init },
      }) => {
        return Effect.runPromise(
          Story.story(
            block,
            Story.given(init({ id: 'test', today }).model),
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Months')
            }),
            Story.inMessage(InMessage.RequestedDropToDays()),
            Story.model(model => {
              expect(model.viewMode).toBe('Days')
            }),
          ),
        )
      })

      it('returns the calendar to Days mode from Years mode (skips Months)', ({
        calendar: { init },
      }) => {
        return Effect.runPromise(
          Story.story(
            block,
            Story.given(init({ id: 'test', today }).model),
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Years')
            }),
            Story.inMessage(InMessage.RequestedDropToDays()),
            Story.model(model => {
              expect(model.viewMode).toBe('Days')
            }),
          ),
        )
      })

      it('is a no-op in Days mode', ({ calendar: { init, operations } }) => {
        const model = init({ id: 'test', today }).model
        expect(operations.requestDropToDays(model).model.viewMode).toBe('Days')
      })

      it('reconciles maybeFocusedDate to a date inside the visible Days grid after Years-mode paging', ({
        calendar: { init },
      }) => {
        return Effect.runPromise(
          Story.story(
            block,
            Story.given(init({ id: 'test', today }).model),
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Years')
            }),
            Story.message(Message.PagedYears({ direction: 1 })),
            Story.model(model => {
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2038, 4, 13)),
              )
              expect(model.viewYear).toBe(2026)
            }),
            Story.inMessage(InMessage.RequestedDropToDays()),
            Story.model(model => {
              expect(model.viewMode).toBe('Days')
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2026, 4, 13)),
              )
            }),
          ),
        )
      })

      it('an ArrowLeft after dropToDays does not drift the calendar to the cursor year', ({
        calendar: { init },
      }) => {
        return Effect.runPromise(
          Story.story(
            block,
            Story.given(init({ id: 'test', today }).model),
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.PagedYears({ direction: 1 })),
            Story.inMessage(InMessage.RequestedDropToDays()),
            Story.message(
              Message.PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false }),
            ),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.viewMonth).toBe(4)
            }),
          ),
        )
      })

      it('clamps the focused day to the days-in-month when reconciling', ({
        calendar: { init },
      }) => {
        const today31 = Calendar.make(2026, 1, 31)
        return Effect.runPromise(
          Story.story(
            block,
            Story.given(init({ id: 'test', today: today31 }).model),
            Story.message(
              Message.PressedKeyOnGrid({ key: 'PageDown', isShift: false }),
            ),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.viewMonth).toBe(2)
            }),
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Years')
            }),
            Story.inMessage(InMessage.RequestedDropToDays()),
            Story.model(model => {
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2026, 2, 28)),
              )
            }),
          ),
        )
      })
    })

    describe('informMinDateChanged', () => {
      it('sets a minimum date on a calendar that had none', ({
        calendar: { init, operations },
      }) => {
        const model = init({ id: 'test', today }).model
        const newMin = Calendar.make(2026, 5, 1)
        const minDateChange = operations.informMinDateChanged(
          model,
          Option.some(newMin),
        )
        expect(minDateChange.model.maybeMinDate).toStrictEqual(
          Option.some(newMin),
        )
      })

      it('replaces an existing minimum date', ({
        calendar: { init, operations },
      }) => {
        const originalMin = Calendar.make(2026, 1, 1)
        const model = init({ id: 'test', today, minDate: originalMin }).model
        const newMin = Calendar.make(2026, 6, 1)
        const minDateChange = operations.informMinDateChanged(
          model,
          Option.some(newMin),
        )
        expect(minDateChange.model.maybeMinDate).toStrictEqual(
          Option.some(newMin),
        )
      })

      it('clears the minimum date when given Option.none()', ({
        calendar: { init, operations },
      }) => {
        const originalMin = Calendar.make(2026, 1, 1)
        const model = init({ id: 'test', today, minDate: originalMin }).model
        const minDateChange = operations.informMinDateChanged(
          model,
          Option.none(),
        )
        expect(minDateChange.model.maybeMinDate).toStrictEqual(Option.none())
      })

      it('causes subsequent ClickedDay on a now-disabled date to be ignored', ({
        calendar: { init, operations, update },
      }) => {
        const model = init({ id: 'test', today }).model
        const newMin = Calendar.make(2026, 6, 1)
        const minDateChange = operations.informMinDateChanged(
          model,
          Option.some(newMin),
        )
        const belowMin = Calendar.make(2026, 5, 10)
        Story.story(
          update,
          Story.given(minDateChange.model),
          Story.message(Message.ClickedDay({ date: belowMin })),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('informMaxDateChanged', () => {
      it('sets a maximum date on a calendar that had none', ({
        calendar: { init, operations },
      }) => {
        const model = init({ id: 'test', today }).model
        const newMax = Calendar.make(2026, 12, 31)
        const maxDateChange = operations.informMaxDateChanged(
          model,
          Option.some(newMax),
        )
        expect(maxDateChange.model.maybeMaxDate).toStrictEqual(
          Option.some(newMax),
        )
      })

      it('clears the maximum date when given Option.none()', ({
        calendar: { init, operations },
      }) => {
        const originalMax = Calendar.make(2026, 12, 31)
        const model = init({ id: 'test', today, maxDate: originalMax }).model
        const maxDateChange = operations.informMaxDateChanged(
          model,
          Option.none(),
        )
        expect(maxDateChange.model.maybeMaxDate).toStrictEqual(Option.none())
      })
    })

    describe('informDisabledDatesChanged', () => {
      it('sets a list of disabled dates', ({
        calendar: { init, operations },
      }) => {
        const model = init({ id: 'test', today }).model
        const disabled = [
          Calendar.make(2026, 4, 15),
          Calendar.make(2026, 4, 16),
        ]
        const disabledDatesChange = operations.informDisabledDatesChanged(
          model,
          disabled,
        )
        expect(disabledDatesChange.model.disabledDates).toStrictEqual(disabled)
      })

      it('replaces the list with an empty array', ({
        calendar: { init, operations },
      }) => {
        const model = init({
          id: 'test',
          today,
          disabledDates: [Calendar.make(2026, 4, 15)],
        }).model
        const disabledDatesChange = operations.informDisabledDatesChanged(
          model,
          [],
        )
        expect(disabledDatesChange.model.disabledDates).toStrictEqual([])
      })

      it('causes subsequent ClickedDay on a newly-disabled date to be ignored', ({
        calendar: { init, operations, update },
      }) => {
        const disabled = Calendar.make(2026, 4, 15)
        const model = init({ id: 'test', today }).model
        const disabledDatesChange = operations.informDisabledDatesChanged(
          model,
          [disabled],
        )
        Story.story(
          update,
          Story.given(disabledDatesChange.model),
          Story.message(Message.ClickedDay({ date: disabled })),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('informDisabledDaysOfWeekChanged', () => {
      it('sets disabled days of the week', ({
        calendar: { init, operations },
      }) => {
        const model = init({ id: 'test', today }).model
        const disabledDaysChange = operations.informDisabledDaysOfWeekChanged(
          model,
          ['Saturday', 'Sunday'],
        )
        expect(disabledDaysChange.model.disabledDaysOfWeek).toStrictEqual([
          'Saturday',
          'Sunday',
        ])
      })

      it('replaces the list with an empty array', ({
        calendar: { init, operations },
      }) => {
        const model = init({
          id: 'test',
          today,
          disabledDaysOfWeek: ['Sunday'],
        }).model
        const disabledDaysChange = operations.informDisabledDaysOfWeekChanged(
          model,
          [],
        )
        expect(disabledDaysChange.model.disabledDaysOfWeek).toStrictEqual([])
      })
    })
  })

  describe('focusDate', () => {
    it('moves the view and cursor to a date without selecting it', ({
      calendar: { operations, init },
    }) => {
      const date = Calendar.make(2026, 8, 15)
      const dateFocus = operations.requestFocusDate(
        init({ id: 'test', today }).model,
        date,
      )
      expect(dateFocus.model.viewYear).toBe(2026)
      expect(dateFocus.model.viewMonth).toBe(8)
      expect(dateFocus.model.maybeFocusedDate).toStrictEqual(Option.some(date))
    })
  })
})
