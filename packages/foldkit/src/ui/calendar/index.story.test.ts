import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import * as Calendar from '../../calendar/index.js'
import * as Story from '../../test/story.js'
import {
  BlurredGrid,
  ChangedViewMonth,
  ClickedDay,
  ClickedHeading,
  ClickedNextMonthButton,
  ClickedPreviousMonthButton,
  CompletedFocusGrid,
  FocusGrid,
  FocusedGrid,
  PagedYears,
  PressedKeyOnGrid,
  RefreshedToday,
  SelectedMonth,
  SelectedYear,
  dropToDays,
  init,
  setDisabledDates,
  setDisabledDaysOfWeek,
  setMaxDate,
  setMinDate,
  update,
} from './index.js'

const today = Calendar.make(2026, 4, 13)

const resolveFocusGrid = Story.Command.resolve(FocusGrid, CompletedFocusGrid())

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
        initialSelectedDate: selected,
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
        minDate,
        maxDate,
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
          Story.with(init({ id: 'test', today, minDate })),
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
              initialSelectedDate: startOfMonth,
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
          Story.with(init({ id: 'test', today, minDate })),
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
          Story.Command.expectNone(),
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

    describe('SelectedMonth', () => {
      it('jumps to the selected month, transitions to Days, and moves focus to the same day in the new month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedMonth({ month: 9 })),
          Story.expectOutMessage(ChangedViewMonth({ year: 2026, month: 9 })),
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

      it('drills back to Days without emitting ChangedViewMonth when the selected month matches the current view month', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedMonth({ month: 4 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Days')
            expect(model.viewMonth).toBe(4)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('is a no-op when the selected month is fully disabled by maxDate', () => {
        const maxDate = Calendar.make(2026, 4, 30)
        Story.story(
          update,
          Story.with(init({ id: 'test', today, maxDate })),
          Story.message(SelectedMonth({ month: 9 })),
          Story.model(model => {
            expect(model.viewMonth).toBe(4)
            expect(model.viewMode).toBe('Days')
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('SelectedYear', () => {
      it('jumps to the selected year and moves focus to the same day in that year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedYear({ year: 2030 })),
          Story.expectOutMessage(ChangedViewMonth({ year: 2030, month: 4 })),
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

      it('transitions the calendar to Months mode after selecting a year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(SelectedYear({ year: 2030 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
        )
      })

      it('is a no-op when the selected year is below minDate', () => {
        const minDate = Calendar.make(2020, 1, 1)
        Story.story(
          update,
          Story.with(init({ id: 'test', today, minDate })),
          Story.message(SelectedYear({ year: 2018 })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMode).toBe('Days')
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('ClickedHeading', () => {
      it('transitions Days to Months', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('transitions Months to Years', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('is a no-op in Years mode (terminal)', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
        )
      })
    })

    describe('PressedKeyOnGrid in Months mode', () => {
      it('ArrowLeft moves the focused month back by 1', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 3, 13)),
            )
          }),
        )
      })

      it('ArrowRight moves the focused month forward by 1', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            PressedKeyOnGrid({ key: 'ArrowRight', isShift: false }),
          ),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 5, 13)),
            )
          }),
        )
      })

      it('ArrowUp moves the focused month back by one row (3 months)', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'ArrowUp', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 1, 13)),
            )
          }),
        )
      })

      it('ArrowDown moves the focused month forward by one row (3 months)', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'ArrowDown', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2026, 7, 13)),
            )
          }),
        )
      })

      it('ArrowLeft at January wraps backward to December of prior year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today: Calendar.make(2026, 1, 15) })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 12, 15)),
            )
          }),
        )
      })

      it('PageUp moves the focused month back by one year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'PageUp', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 4, 13)),
            )
          }),
        )
      })

      it('PageDown moves the focused month forward by one year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'PageDown', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2027, 4, 13)),
            )
          }),
        )
      })

      it('unknown keys are no-ops in Months mode', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'a', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PressedKeyOnGrid in Years mode', () => {
      it('arrow nav moves the cursor without changing viewYear (the selection)', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(
            PressedKeyOnGrid({ key: 'ArrowRight', isShift: false }),
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

      it('ArrowLeft moves the cursor back by 1 year', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2025, 4, 13)),
            )
          }),
        )
      })

      it('ArrowUp moves the cursor back by one row (3 years)', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'ArrowUp', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2023, 4, 13)),
            )
          }),
        )
      })

      it('PageDown advances the cursor by one window (12 years)', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'PageDown', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2038, 4, 13)),
            )
          }),
        )
      })

      it('unknown keys are no-ops in Years mode', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.message(PressedKeyOnGrid({ key: 'a', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PagedYears', () => {
      it('shifts the cursor forward by 12 years with direction +1, leaving viewYear untouched', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PagedYears({ direction: 1 })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.maybeFocusedDate).toStrictEqual(
              Option.some(Calendar.make(2038, 4, 13)),
            )
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('shifts the cursor backward by 12 years with direction -1, leaving viewYear untouched', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(PagedYears({ direction: -1 })),
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
      it('Days → Months → Years → SelectedYear → SelectedMonth → Days', () => {
        Story.story(
          update,
          Story.with(init({ id: 'test', today })),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
          Story.message(ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
          Story.message(SelectedYear({ year: 2020 })),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
            expect(model.viewYear).toBe(2020)
          }),
          Story.message(SelectedMonth({ month: 3 })),
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

  describe('programmatic setters', () => {
    describe('dropToDays', () => {
      it('returns the calendar to Days mode from Months mode', () => {
        const model = init({ id: 'test', today })
        const inMonths = update(model, ClickedHeading())[0]
        expect(inMonths.viewMode).toBe('Months')
        expect(dropToDays(inMonths).viewMode).toBe('Days')
      })

      it('returns the calendar to Days mode from Years mode (skips Months)', () => {
        const model = init({ id: 'test', today })
        const inYears = update(
          update(model, ClickedHeading())[0],
          ClickedHeading(),
        )[0]
        expect(inYears.viewMode).toBe('Years')
        expect(dropToDays(inYears).viewMode).toBe('Days')
      })

      it('is a no-op in Days mode', () => {
        const model = init({ id: 'test', today })
        expect(dropToDays(model).viewMode).toBe('Days')
      })

      it('reconciles maybeFocusedDate to a date inside the visible Days grid after Years-mode paging', () => {
        const model = init({ id: 'test', today })
        const inYears = update(
          update(model, ClickedHeading())[0],
          ClickedHeading(),
        )[0]
        expect(inYears.viewMode).toBe('Years')
        const paged = update(inYears, PagedYears({ direction: 1 }))[0]
        expect(paged.maybeFocusedDate).toStrictEqual(
          Option.some(Calendar.make(2038, 4, 13)),
        )
        expect(paged.viewYear).toBe(2026)
        const dropped = dropToDays(paged)
        expect(dropped.viewMode).toBe('Days')
        expect(dropped.maybeFocusedDate).toStrictEqual(
          Option.some(Calendar.make(2026, 4, 13)),
        )
      })

      it('an ArrowLeft after dropToDays does not drift the calendar to the cursor year', () => {
        const model = init({ id: 'test', today })
        const inYears = update(
          update(model, ClickedHeading())[0],
          ClickedHeading(),
        )[0]
        const paged = update(inYears, PagedYears({ direction: 1 }))[0]
        const dropped = dropToDays(paged)
        const afterArrow = update(
          dropped,
          PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false }),
        )[0]
        expect(afterArrow.viewYear).toBe(2026)
        expect(afterArrow.viewMonth).toBe(4)
      })

      it('clamps the focused day to the days-in-month when reconciling', () => {
        const today31 = Calendar.make(2026, 1, 31)
        const model = init({ id: 'test', today: today31 })
        const movedToFebruary = update(
          model,
          PressedKeyOnGrid({ key: 'PageDown', isShift: false }),
        )[0]
        expect(movedToFebruary.viewYear).toBe(2026)
        expect(movedToFebruary.viewMonth).toBe(2)
        const inYears = update(
          update(movedToFebruary, ClickedHeading())[0],
          ClickedHeading(),
        )[0]
        const dropped = dropToDays(inYears)
        expect(dropped.maybeFocusedDate).toStrictEqual(
          Option.some(Calendar.make(2026, 2, 28)),
        )
      })
    })

    describe('setMinDate', () => {
      it('sets a minimum date on a calendar that had none', () => {
        const model = init({ id: 'test', today })
        const newMin = Calendar.make(2026, 5, 1)
        const next = setMinDate(model, Option.some(newMin))
        expect(next.maybeMinDate).toStrictEqual(Option.some(newMin))
      })

      it('replaces an existing minimum date', () => {
        const originalMin = Calendar.make(2026, 1, 1)
        const model = init({ id: 'test', today, minDate: originalMin })
        const newMin = Calendar.make(2026, 6, 1)
        const next = setMinDate(model, Option.some(newMin))
        expect(next.maybeMinDate).toStrictEqual(Option.some(newMin))
      })

      it('clears the minimum date when given Option.none()', () => {
        const originalMin = Calendar.make(2026, 1, 1)
        const model = init({ id: 'test', today, minDate: originalMin })
        const next = setMinDate(model, Option.none())
        expect(next.maybeMinDate).toStrictEqual(Option.none())
      })

      it('does not reconcile a previously-selected date below the new min', () => {
        const selected = Calendar.make(2026, 3, 15)
        const model = init({
          id: 'test',
          today,
          initialSelectedDate: selected,
        })
        const newMin = Calendar.make(2026, 6, 1)
        const next = setMinDate(model, Option.some(newMin))
        expect(next.maybeSelectedDate).toStrictEqual(Option.some(selected))
      })

      it('causes subsequent ClickedDay on a now-disabled date to be ignored', () => {
        const model = init({ id: 'test', today })
        const newMin = Calendar.make(2026, 6, 1)
        const withMin = setMinDate(model, Option.some(newMin))
        const belowMin = Calendar.make(2026, 5, 10)
        Story.story(
          update,
          Story.with(withMin),
          Story.message(ClickedDay({ date: belowMin })),
          Story.model(m => {
            expect(m.maybeSelectedDate).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('setMaxDate', () => {
      it('sets a maximum date on a calendar that had none', () => {
        const model = init({ id: 'test', today })
        const newMax = Calendar.make(2026, 12, 31)
        const next = setMaxDate(model, Option.some(newMax))
        expect(next.maybeMaxDate).toStrictEqual(Option.some(newMax))
      })

      it('clears the maximum date when given Option.none()', () => {
        const originalMax = Calendar.make(2026, 12, 31)
        const model = init({ id: 'test', today, maxDate: originalMax })
        const next = setMaxDate(model, Option.none())
        expect(next.maybeMaxDate).toStrictEqual(Option.none())
      })
    })

    describe('setDisabledDates', () => {
      it('sets a list of disabled dates', () => {
        const model = init({ id: 'test', today })
        const disabled = [
          Calendar.make(2026, 4, 15),
          Calendar.make(2026, 4, 16),
        ]
        const next = setDisabledDates(model, disabled)
        expect(next.disabledDates).toStrictEqual(disabled)
      })

      it('replaces the list with an empty array', () => {
        const model = init({
          id: 'test',
          today,
          disabledDates: [Calendar.make(2026, 4, 15)],
        })
        const next = setDisabledDates(model, [])
        expect(next.disabledDates).toStrictEqual([])
      })

      it('causes subsequent ClickedDay on a newly-disabled date to be ignored', () => {
        const disabled = Calendar.make(2026, 4, 15)
        const model = init({ id: 'test', today })
        const withDisabled = setDisabledDates(model, [disabled])
        Story.story(
          update,
          Story.with(withDisabled),
          Story.message(ClickedDay({ date: disabled })),
          Story.model(m => {
            expect(m.maybeSelectedDate).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('setDisabledDaysOfWeek', () => {
      it('sets disabled days of the week', () => {
        const model = init({ id: 'test', today })
        const next = setDisabledDaysOfWeek(model, ['Saturday', 'Sunday'])
        expect(next.disabledDaysOfWeek).toStrictEqual(['Saturday', 'Sunday'])
      })

      it('replaces the list with an empty array', () => {
        const model = init({
          id: 'test',
          today,
          disabledDaysOfWeek: ['Sunday'],
        })
        const next = setDisabledDaysOfWeek(model, [])
        expect(next.disabledDaysOfWeek).toStrictEqual([])
      })
    })
  })
})
