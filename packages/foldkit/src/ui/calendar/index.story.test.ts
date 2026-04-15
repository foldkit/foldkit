import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import * as Calendar from '../../calendar'
import * as Story from '../../test/story'
import {
  BlurredGrid,
  ChangedViewMonth,
  ClickedDay,
  ClickedNextMonthButton,
  ClickedPreviousMonthButton,
  FocusedGrid,
  PressedKeyOnGrid,
  RefreshedToday,
  SelectedMonthFromDropdown,
  SelectedYearFromDropdown,
  init,
  update,
} from './index'

const today = Calendar.make(2026, 4, 13)

describe('Calendar', () => {
  describe('init', () => {
    it('defaults the view to today when no initial date is provided', () => {
      const model = init({ id: 'test', today })
      expect(model.viewYear).toBe(2026)
      expect(model.viewMonth).toBe(4)
      expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
      expect(model.maybeSelectedDate).toStrictEqual(Option.none())
      expect(model.isGridFocused).toBe(false)
    })

    it('sets the view to the month of the initial selected date', () => {
      const selected = Calendar.make(2026, 8, 22)
      const model = init({
        id: 'test',
        today,
        maybeInitialSelectedDate: Option.some(selected),
      })
      expect(model.viewYear).toBe(2026)
      expect(model.viewMonth).toBe(8)
      expect(model.maybeFocusedDate).toStrictEqual(Option.some(selected))
      expect(model.maybeSelectedDate).toStrictEqual(Option.some(selected))
    })

    it('carries locale, min/max, and disabled configuration', () => {
      const minDate = Calendar.make(2026, 1, 1)
      const maxDate = Calendar.make(2026, 12, 31)
      const model = init({
        id: 'test',
        today,
        maybeMinDate: Option.some(minDate),
        maybeMaxDate: Option.some(maxDate),
        disabledDaysOfWeek: ['Sunday'],
      })
      expect(model.maybeMinDate).toStrictEqual(Option.some(minDate))
      expect(model.maybeMaxDate).toStrictEqual(Option.some(maxDate))
      expect(model.disabledDaysOfWeek).toStrictEqual(['Sunday'])
    })
  })

  describe('update', () => {
    describe('ClickedDay', () => {
      it('commits the clicked date to internal state', () => {
        const target = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.some(target))
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(target))
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('emits ChangedViewMonth when clicking into a different month', () => {
        const target = Calendar.make(2026, 6, 5)
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(6)
            expect(model.maybeSelectedDate).toStrictEqual(Option.some(target))
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 6 })),
        )
      })

      it('ignores clicks on dates before minDate', () => {
        const target = Calendar.make(2026, 4, 10)
        const minDate = Calendar.make(2026, 4, 15)
        Story.story(
          update,
          Story.with(
            init({ id: 'test', today, maybeMinDate: Option.some(minDate) }),
          ),
          Story.message(ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.none())
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('ignores clicks on dates matching a disabled day-of-week', () => {
        // 2026-04-19 is a Sunday
        const target = Calendar.make(2026, 4, 19)
        Story.story(
          update,
          Story.with(
            init({ id: 'test', today, disabledDaysOfWeek: ['Sunday'] }),
          ),
          Story.message(ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.none())
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('ignores clicks on explicitly disabled dates', () => {
        const target = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          Story.with(init({ id: 'test', today, disabledDates: [target] })),
          Story.message(ClickedDay({ date: target })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.none())
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PressedKeyOnGrid', () => {
      const expectFocus = (expected: Calendar.CalendarDate) =>
        Story.model((model: ReturnType<typeof init>) => {
          expect(model.maybeFocusedDate).toStrictEqual(Option.some(expected))
        })

      it('ArrowLeft moves focus back one day', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false })),
          expectFocus(Calendar.make(2026, 4, 12)),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowRight moves focus forward one day', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(
            PressedKeyOnGrid({ key: 'ArrowRight', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 4, 14)),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowUp moves focus back one week', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'ArrowUp', isShift: false })),
          expectFocus(Calendar.make(2026, 4, 6)),
          Story.expectNoOutMessage(),
        )
      })

      it('ArrowDown moves focus forward one week', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'ArrowDown', isShift: false })),
          expectFocus(Calendar.make(2026, 4, 20)),
          Story.expectNoOutMessage(),
        )
      })

      it('Home moves focus to the start of the week (Sunday locale)', () => {
        // 2026-04-13 is a Monday; Sunday-start week begins 2026-04-12
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'Home', isShift: false })),
          expectFocus(Calendar.make(2026, 4, 12)),
        )
      })

      it('End moves focus to the end of the week (Sunday locale)', () => {
        // 2026-04-13 is a Monday; Sunday-start week ends 2026-04-18 (Saturday)
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'End', isShift: false })),
          expectFocus(Calendar.make(2026, 4, 18)),
        )
      })

      it('PageUp moves focus back one month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'PageUp', isShift: false })),
          expectFocus(Calendar.make(2026, 3, 13)),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 3 })),
        )
      })

      it('PageDown moves focus forward one month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'PageDown', isShift: false })),
          expectFocus(Calendar.make(2026, 5, 13)),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 5 })),
        )
      })

      it('Shift+PageUp moves focus back one year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'PageUp', isShift: true })),
          expectFocus(Calendar.make(2025, 4, 13)),
          Story.expectOutMessage(ChangedViewMonth({ year: 2025, month: 4 })),
        )
      })

      it('Shift+PageDown moves focus forward one year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'PageDown', isShift: true })),
          expectFocus(Calendar.make(2027, 4, 13)),
          Story.expectOutMessage(ChangedViewMonth({ year: 2027, month: 4 })),
        )
      })

      it('Enter commits the focused date to internal state', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'Enter', isShift: false })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('Space commits the focused date to internal state', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: ' ', isShift: false })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('crossing a month boundary updates the view and emits ChangedViewMonth', () => {
        // Focus on April 1, 2026 (Wednesday); ArrowLeft goes to March 31
        const startOfMonth = Calendar.make(2026, 4, 1)
        Story.story(
          update,
          Story.with(
            init({
              id: 'test',
              today,
              maybeInitialSelectedDate: Option.some(startOfMonth),
            }),
          ),
          Story.message(PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(3)
          }),
          expectFocus(Calendar.make(2026, 3, 31)),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 3 })),
        )
      })

      it('Enter on a disabled date is a no-op', () => {
        // minDate excludes today, so the cursor lands on a disabled date
        const minDate = Calendar.make(2026, 5, 1)
        Story.story(
          update,
          Story.with(
            init({ id: 'test', today, maybeMinDate: Option.some(minDate) }),
          ),
          Story.message(PressedKeyOnGrid({ key: 'Enter', isShift: false })),
          Story.model(model => {
            expect(model.maybeSelectedDate).toStrictEqual(Option.none())
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('skips disabled days during arrow navigation', () => {
        // Disable the next day (2026-04-14); ArrowRight should skip to 2026-04-15
        const disabled = Calendar.make(2026, 4, 14)
        Story.story(
          update,
          Story.with(init({ id: 'test', today, disabledDates: [disabled] })),
          Story.message(
            PressedKeyOnGrid({ key: 'ArrowRight', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 4, 15)),
        )
      })

      it('unknown keys are no-ops', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PressedKeyOnGrid({ key: 'x', isShift: false })),
          expectFocus(today),
          Story.expectNoOutMessage(),
          Story.expectNoCommands(),
        )
      })
    })

    describe('ClickedPreviousMonthButton', () => {
      it('decrements the view month and moves focus to the same day in the new month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedPreviousMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(3)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 3, 13)),
            )
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 3 })),
        )
      })

      it('rolls the year back when navigating from January', () => {
        const januaryToday = Calendar.make(2026, 1, 15)
        Story.story(
          update,
          Story.with(init({ id: 'test', today: januaryToday })),
          Story.message(ClickedPreviousMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2025)
            expect(model.viewMonth).toBe(12)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 12, 15)),
            )
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2025, month: 12 })),
        )
      })
    })

    describe('ClickedNextMonthButton', () => {
      it('increments the view month and moves focus to the same day in the new month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedNextMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(5)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 5, 13)),
            )
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 5 })),
        )
      })

      it('rolls the year forward when navigating from December', () => {
        const decemberToday = Calendar.make(2026, 12, 15)
        Story.story(
          update,
          Story.with(init({ id: 'test', today: decemberToday })),
          Story.message(ClickedNextMonthButton()),
          Story.model(model => {
            expect(model.viewYear).toBe(2027)
            expect(model.viewMonth).toBe(1)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2027, 1, 15)),
            )
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2027, month: 1 })),
        )
      })

      it('clamps focus day-of-month when the day does not exist in the new month', () => {
        // Jan 31 → Feb 28 (2026 is not a leap year)
        const januaryEnd = Calendar.make(2026, 1, 31)
        Story.story(
          update,
          Story.with(init({ id: 'test', today: januaryEnd })),
          Story.message(ClickedNextMonthButton()),
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

    describe('SelectedMonthFromDropdown', () => {
      it('jumps to the selected month and moves focus to the same day in the new month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedMonthFromDropdown({ month: 9 })),
          Story.model(model => {
            expect(model.viewMonth).toBe(9)
            expect(model.viewYear).toBe(2026)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 9, 13)),
            )
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 9 })),
        )
      })

      it('is a no-op when the selected month matches the current month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedMonthFromDropdown({ month: 4 })),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('SelectedYearFromDropdown', () => {
      it('jumps to the selected year and moves focus to the same day in that year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedYearFromDropdown({ year: 2030 })),
          Story.model(model => {
            expect(model.viewYear).toBe(2030)
            expect(model.viewMonth).toBe(4)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2030, 4, 13)),
            )
          }),
          Story.expectOutMessage(ChangedViewMonth({ year: 2030, month: 4 })),
        )
      })
    })

    describe('FocusedGrid / BlurredGrid', () => {
      it('FocusedGrid sets isGridFocused to true', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(FocusedGrid()),
          Story.model(model => {
            expect(model.isGridFocused).toBe(true)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('BlurredGrid sets isGridFocused to false', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(FocusedGrid()),
          Story.message(BlurredGrid()),
          Story.model(model => {
            expect(model.isGridFocused).toBe(false)
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('RefreshedToday', () => {
      it('updates the today field', () => {
        const newToday = Calendar.make(2026, 4, 14)
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(RefreshedToday({ today: newToday })),
          Story.model(model => {
            expect(model.today).toStrictEqual(newToday)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('does not move the focus cursor or selected date', () => {
        const newToday = Calendar.make(2026, 4, 20)
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(RefreshedToday({ today: newToday })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
            expect(model.maybeSelectedDate).toStrictEqual(Option.none())
          }),
        )
      })
    })
  })
})
