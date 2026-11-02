import { Option } from 'effect'
import * as Calendar from 'foldkit/calendar'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  CalendarLive,
  FocusGrid,
  Message,
  type Model,
  OutMessage,
} from './block.js'

const today = Calendar.make(2026, 4, 13)

const resolveFocusGrid = Story.Command.resolve(
  FocusGrid,
  Message.CompletedFocusGrid(),
)

describe('Calendar', () => {
  describe('init', () => {
    it.effect(
      'defaults the view to today when no initial date is provided',
      () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(4)
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
            expect(model.isGridFocused).toBe(false)
          }),
        ),
    )

    it.effect('sets the view to the month of the initial view date', () => {
      const initialViewDate = Calendar.make(2026, 8, 22)
      return Story.story(
        CalendarLive,
        { id: 'test', today, initialViewDate },
        Story.model(model => {
          expect(model.viewYear).toBe(2026)
          expect(model.viewMonth).toBe(8)
          expect(model.maybeFocusedDate).toStrictEqual(
            Option.some(initialViewDate),
          )
        }),
      )
    })

    it.effect('carries locale, min/max, and disabled configuration', () => {
      const minDate = Calendar.make(2026, 1, 1)
      const maxDate = Calendar.make(2026, 12, 31)
      return Story.story(
        CalendarLive,
        {
          id: 'test',
          today,
          minDate,
          maxDate,
          disabledDaysOfWeek: ['Sunday'],
        },
        Story.model(model => {
          expect(model.maybeMinDate).toStrictEqual(Option.some(minDate))
          expect(model.maybeMaxDate).toStrictEqual(Option.some(maxDate))
          expect(model.disabledDaysOfWeek).toStrictEqual(['Sunday'])
        }),
      )
    })
  })

  describe('update', () => {
    describe('ClickedDay', () => {
      it.effect(
        'commits the clicked date to internal state and emits SelectedDate',
        () => {
          const target = Calendar.make(2026, 4, 20)
          return Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.ClickedDay({ date: target })),
            Story.model(model => {
              expect(model.maybeFocusedDate).toStrictEqual(Option.some(target))
            }),
            Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
          )
        },
      )

      it.effect(
        'syncs view month and emits SelectedDate when clicking into a different month',
        () => {
          const target = Calendar.make(2026, 6, 5)
          return Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.ClickedDay({ date: target })),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.viewMonth).toBe(6)
            }),
            Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
          )
        },
      )

      it.effect('ignores clicks on dates before minDate', () => {
        const target = Calendar.make(2026, 4, 10)
        const minDate = Calendar.make(2026, 4, 15)
        return Story.story(
          CalendarLive,
          { id: 'test', today, minDate },
          Story.message(Message.ClickedDay({ date: target })),
          Story.expectNoOutMessage(),
        )
      })

      it.effect(
        'ignores clicks on dates matching a disabled day-of-week',
        () => {
          // 2026-04-19 is a Sunday
          const target = Calendar.make(2026, 4, 19)
          return Story.story(
            CalendarLive,
            { id: 'test', today, disabledDaysOfWeek: ['Sunday'] },
            Story.message(Message.ClickedDay({ date: target })),
            Story.expectNoOutMessage(),
          )
        },
      )

      it.effect('ignores clicks on explicitly disabled dates', () => {
        const target = Calendar.make(2026, 4, 20)
        return Story.story(
          CalendarLive,
          { id: 'test', today, disabledDates: [target] },
          Story.message(Message.ClickedDay({ date: target })),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('PressedKeyOnGrid', () => {
      const expectFocus = (expected: Calendar.CalendarDate) =>
        Story.model((model: Pick<Model, 'maybeFocusedDate'>) => {
          expect(model.maybeFocusedDate).toStrictEqual(Option.some(expected))
        })

      it.effect('ArrowLeft moves focus back one day', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowLeft',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 12)),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('ArrowRight moves focus forward one day', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 14)),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('ArrowUp moves focus back one week', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({ key: 'ArrowUp', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 4, 6)),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('ArrowDown moves focus forward one week', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowDown',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 20)),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect(
        'Home moves focus to the start of the week (Sunday locale)',
        () => {
          // 2026-04-13 is a Monday; Sunday-start week begins 2026-04-12
          return Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(
              Message.PressedKeyOnGrid({ key: 'Home', isShift: false }),
            ),
            expectFocus(Calendar.make(2026, 4, 12)),
          )
        },
      )

      it.effect(
        'End moves focus to the end of the week (Sunday locale)',
        () => {
          // 2026-04-13 is a Monday; Sunday-start week ends 2026-04-18 (Saturday)
          return Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(
              Message.PressedKeyOnGrid({ key: 'End', isShift: false }),
            ),
            expectFocus(Calendar.make(2026, 4, 18)),
          )
        },
      )

      it.effect('PageUp moves focus back one month', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageUp', isShift: false }),
          ),
          expectFocus(Calendar.make(2026, 3, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2026, month: 3 }),
          ),
        ),
      )

      it.effect('PageDown moves focus forward one month', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('Shift+PageUp moves focus back one year', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageUp', isShift: true }),
          ),
          expectFocus(Calendar.make(2025, 4, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2025, month: 4 }),
          ),
        ),
      )

      it.effect('Shift+PageDown moves focus forward one year', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({ key: 'PageDown', isShift: true }),
          ),
          expectFocus(Calendar.make(2027, 4, 13)),
          Story.expectOutMessage(
            OutMessage.ChangedViewMonth({ year: 2027, month: 4 }),
          ),
        ),
      )

      it.effect('Enter commits the focused date and emits SelectedDate', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.PressedKeyOnGrid({ key: 'Enter', isShift: false }),
          ),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: today })),
        ),
      )

      it.effect('Space commits the focused date and emits SelectedDate', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.PressedKeyOnGrid({ key: ' ', isShift: false })),
          Story.expectOutMessage(OutMessage.SelectedDate({ date: today })),
        ),
      )

      it.effect(
        'crossing a month boundary updates the view and emits ChangedViewMonth',
        () => {
          // Focus on April 1, 2026 (Wednesday); ArrowLeft goes to March 31
          const startOfMonth = Calendar.make(2026, 4, 1)
          return Story.story(
            CalendarLive,
            {
              id: 'test',
              today,
              initialViewDate: startOfMonth,
            },
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
        },
      )

      it.effect('Enter on a disabled date is a no-op', () => {
        // minDate excludes today, so the cursor lands on a disabled date
        const minDate = Calendar.make(2026, 5, 1)
        return Story.story(
          CalendarLive,
          { id: 'test', today, minDate },
          Story.message(
            Message.PressedKeyOnGrid({ key: 'Enter', isShift: false }),
          ),
          Story.expectNoOutMessage(),
        )
      })

      it.effect('skips disabled days during arrow navigation', () => {
        // Disable the next day (2026-04-14); ArrowRight should skip to 2026-04-15
        const disabled = Calendar.make(2026, 4, 14)
        return Story.story(
          CalendarLive,
          { id: 'test', today, disabledDates: [disabled] },
          Story.message(
            Message.PressedKeyOnGrid({
              key: 'ArrowRight',
              isShift: false,
            }),
          ),
          expectFocus(Calendar.make(2026, 4, 15)),
        )
      })

      it.effect('unknown keys are no-ops', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.PressedKeyOnGrid({ key: 'x', isShift: false })),
          expectFocus(today),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        ),
      )
    })

    describe('ClickedPreviousMonthButton', () => {
      it.effect(
        'decrements the view month and moves focus to the same day in the new month',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect('rolls the year back when navigating from January', () => {
        const januaryToday = Calendar.make(2026, 1, 15)
        return Story.story(
          CalendarLive,
          { id: 'test', today: januaryToday },
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
      it.effect(
        'increments the view month and moves focus to the same day in the new month',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect('rolls the year forward when navigating from December', () => {
        const decemberToday = Calendar.make(2026, 12, 15)
        return Story.story(
          CalendarLive,
          { id: 'test', today: decemberToday },
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

      it.effect(
        'clamps focus day-of-month when the day does not exist in the new month',
        () => {
          const januaryEnd = Calendar.make(2026, 1, 31)
          return Story.story(
            CalendarLive,
            { id: 'test', today: januaryEnd },
            Story.message(Message.ClickedNextMonthButton()),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.viewMonth).toBe(2)
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2026, 2, 28)),
              )
            }),
          )
        },
      )
    })

    describe('SelectedMonth', () => {
      it.effect(
        'jumps to the selected month, transitions to Days, and moves focus to the same day in the new month',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect(
        'drills back to Days without emitting ChangedViewMonth when the selected month matches the current view month',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.SelectedMonth({ month: 4 })),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Days')
              expect(model.viewMonth).toBe(4)
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect(
        'is a no-op when the selected month is fully disabled by maxDate',
        () => {
          const maxDate = Calendar.make(2026, 4, 30)
          return Story.story(
            CalendarLive,
            { id: 'test', today, maxDate },
            Story.message(Message.SelectedMonth({ month: 9 })),
            Story.model(model => {
              expect(model.viewMonth).toBe(4)
              expect(model.viewMode).toBe('Days')
            }),
            Story.expectNoOutMessage(),
          )
        },
      )
    })

    describe('SelectedYear', () => {
      it.effect(
        'jumps to the selected year and moves focus to the same day in that year',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect(
        'transitions the calendar to Months mode after selecting a year',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.SelectedYear({ year: 2030 })),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Months')
            }),
          ),
      )

      it.effect('is a no-op when the selected year is below minDate', () => {
        const minDate = Calendar.make(2020, 1, 1)
        return Story.story(
          CalendarLive,
          { id: 'test', today, minDate },
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
      it.effect('transitions Days to Months', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('transitions Months to Years', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('is a no-op in Years mode (terminal)', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          Story.model(model => {
            expect(model.viewMode).toBe('Years')
          }),
        ),
      )
    })

    describe('PressedKeyOnGrid in Months mode', () => {
      it.effect('ArrowLeft moves the focused month back by 1', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('ArrowRight moves the focused month forward by 1', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect(
        'ArrowUp moves the focused month back by one row (3 months)',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect(
        'ArrowDown moves the focused month forward by one row (3 months)',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect(
        'ArrowLeft at January wraps backward to December of prior year',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today: Calendar.make(2026, 1, 15) },
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
          ),
      )

      it.effect('PageUp moves the focused month back by one year', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('PageDown moves the focused month forward by one year', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('unknown keys are no-ops in Months mode', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.PressedKeyOnGrid({ key: 'a', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        ),
      )
    })

    describe('PressedKeyOnGrid in Years mode', () => {
      it.effect(
        'arrow nav moves the cursor without changing viewYear (the selection)',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )

      it.effect('ArrowLeft moves the cursor back by 1 year', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('ArrowUp moves the cursor back by one row (3 years)', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('PageDown advances the cursor by one window (12 years)', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
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
        ),
      )

      it.effect('unknown keys are no-ops in Years mode', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.message(Message.PressedKeyOnGrid({ key: 'a', isShift: false })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
          Story.expectNoOutMessage(),
        ),
      )
    })

    describe('PagedYears', () => {
      it.effect(
        'shifts the cursor forward by 12 years with direction +1, leaving viewYear untouched',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.PagedYears({ direction: 1 })),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2038, 4, 13)),
              )
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect(
        'shifts the cursor backward by 12 years with direction -1, leaving viewYear untouched',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.PagedYears({ direction: -1 })),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2014, 4, 13)),
              )
            }),
            Story.expectNoOutMessage(),
          ),
      )
    })

    describe('full year-jump flow', () => {
      it.effect(
        'Days → Months → Years → SelectedYear → SelectedMonth → Days',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
          ),
      )
    })

    describe('FocusedGrid / BlurredGrid', () => {
      it.effect('FocusedGrid sets isGridFocused to true', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.FocusedGrid()),
          Story.model(model => {
            expect(model.isGridFocused).toBe(true)
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('BlurredGrid sets isGridFocused to false', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.FocusedGrid()),
          Story.message(Message.BlurredGrid()),
          Story.model(model => {
            expect(model.isGridFocused).toBe(false)
          }),
          Story.expectNoOutMessage(),
        ),
      )
    })

    describe('RefreshedToday', () => {
      it.effect('updates the today field', () => {
        const newToday = Calendar.make(2026, 4, 14)
        return Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.RefreshedToday({ today: newToday })),
          Story.model(model => {
            expect(model.today).toStrictEqual(newToday)
          }),
          Story.expectNoOutMessage(),
        )
      })

      it.effect('does not move the focus cursor', () => {
        const newToday = Calendar.make(2026, 4, 20)
        return Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.RefreshedToday({ today: newToday })),
          Story.model(model => {
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(today))
          }),
        )
      })
    })
  })

  describe('parent requests', () => {
    describe('RequestedDropToDays', () => {
      it.effect('returns the calendar to Days mode from Months mode', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.ClickedHeading()),
          resolveFocusGrid,
          Story.model(model => {
            expect(model.viewMode).toBe('Months')
          }),
          Story.message(Message.RequestedDropToDays()),
          Story.model(model => {
            expect(model.viewMode).toBe('Days')
          }),
        ),
      )

      it.effect(
        'returns the calendar to Days mode from Years mode (skips Months)',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.model(model => {
              expect(model.viewMode).toBe('Years')
            }),
            Story.message(Message.RequestedDropToDays()),
            Story.model(model => {
              expect(model.viewMode).toBe('Days')
            }),
          ),
      )

      it.effect('is a no-op in Days mode', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.RequestedDropToDays()),
          Story.model(model => {
            expect(model.viewMode).toBe('Days')
          }),
        ),
      )

      it.effect(
        'reconciles maybeFocusedDate to a date inside the visible Days grid after Years-mode paging',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
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
            Story.message(Message.RequestedDropToDays()),
            Story.model(model => {
              expect(model.viewMode).toBe('Days')
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2026, 4, 13)),
              )
            }),
          ),
      )

      it.effect(
        'an ArrowLeft after RequestedDropToDays does not drift the calendar to the cursor year',
        () =>
          Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.ClickedHeading()),
            resolveFocusGrid,
            Story.message(Message.PagedYears({ direction: 1 })),
            Story.message(Message.RequestedDropToDays()),
            Story.message(
              Message.PressedKeyOnGrid({ key: 'ArrowLeft', isShift: false }),
            ),
            Story.model(model => {
              expect(model.viewYear).toBe(2026)
              expect(model.viewMonth).toBe(4)
            }),
          ),
      )

      it.effect(
        'clamps the focused day to the days-in-month when reconciling',
        () => {
          const today31 = Calendar.make(2026, 1, 31)
          return Story.story(
            CalendarLive,
            { id: 'test', today: today31 },
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
            Story.message(Message.RequestedDropToDays()),
            Story.model(model => {
              expect(model.maybeFocusedDate).toStrictEqual(
                Option.some(Calendar.make(2026, 2, 28)),
              )
            }),
          )
        },
      )
    })

    describe('InformedOfMinDateChange', () => {
      it.effect('sets a minimum date on a calendar that had none', () => {
        const newMin = Calendar.make(2026, 5, 1)
        return Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.InformedOfMinDateChange({
              maybeMinDate: Option.some(newMin),
            }),
          ),
          Story.model(model => {
            expect(model.maybeMinDate).toStrictEqual(Option.some(newMin))
          }),
        )
      })

      it.effect('replaces an existing minimum date', () => {
        const originalMin = Calendar.make(2026, 1, 1)
        const newMin = Calendar.make(2026, 6, 1)
        return Story.story(
          CalendarLive,
          { id: 'test', today, minDate: originalMin },
          Story.message(
            Message.InformedOfMinDateChange({
              maybeMinDate: Option.some(newMin),
            }),
          ),
          Story.model(model => {
            expect(model.maybeMinDate).toStrictEqual(Option.some(newMin))
          }),
        )
      })

      it.effect('clears the minimum date when given Option.none()', () => {
        const originalMin = Calendar.make(2026, 1, 1)
        return Story.story(
          CalendarLive,
          { id: 'test', today, minDate: originalMin },
          Story.message(
            Message.InformedOfMinDateChange({ maybeMinDate: Option.none() }),
          ),
          Story.model(model => {
            expect(model.maybeMinDate).toStrictEqual(Option.none())
          }),
        )
      })

      it.effect(
        'causes subsequent ClickedDay on a now-disabled date to be ignored',
        () => {
          const newMin = Calendar.make(2026, 6, 1)
          const belowMin = Calendar.make(2026, 5, 10)
          return Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(
              Message.InformedOfMinDateChange({
                maybeMinDate: Option.some(newMin),
              }),
            ),
            Story.message(Message.ClickedDay({ date: belowMin })),
            Story.expectNoOutMessage(),
          )
        },
      )
    })

    describe('InformedOfMaxDateChange', () => {
      it.effect('sets a maximum date on a calendar that had none', () => {
        const newMax = Calendar.make(2026, 12, 31)
        return Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.InformedOfMaxDateChange({
              maybeMaxDate: Option.some(newMax),
            }),
          ),
          Story.model(model => {
            expect(model.maybeMaxDate).toStrictEqual(Option.some(newMax))
          }),
        )
      })

      it.effect('clears the maximum date when given Option.none()', () => {
        const originalMax = Calendar.make(2026, 12, 31)
        return Story.story(
          CalendarLive,
          { id: 'test', today, maxDate: originalMax },
          Story.message(
            Message.InformedOfMaxDateChange({ maybeMaxDate: Option.none() }),
          ),
          Story.model(model => {
            expect(model.maybeMaxDate).toStrictEqual(Option.none())
          }),
        )
      })
    })

    describe('InformedOfDisabledDatesChange', () => {
      it.effect('sets a list of disabled dates', () => {
        const disabled = [
          Calendar.make(2026, 4, 15),
          Calendar.make(2026, 4, 16),
        ]
        return Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.InformedOfDisabledDatesChange({ disabledDates: disabled }),
          ),
          Story.model(model => {
            expect(model.disabledDates).toStrictEqual(disabled)
          }),
        )
      })

      it.effect('replaces the list with an empty array', () =>
        Story.story(
          CalendarLive,
          {
            id: 'test',
            today,
            disabledDates: [Calendar.make(2026, 4, 15)],
          },
          Story.message(
            Message.InformedOfDisabledDatesChange({ disabledDates: [] }),
          ),
          Story.model(model => {
            expect(model.disabledDates).toStrictEqual([])
          }),
        ),
      )

      it.effect(
        'causes subsequent ClickedDay on a newly-disabled date to be ignored',
        () => {
          const disabled = Calendar.make(2026, 4, 15)
          return Story.story(
            CalendarLive,
            { id: 'test', today },
            Story.message(
              Message.InformedOfDisabledDatesChange({
                disabledDates: [disabled],
              }),
            ),
            Story.message(Message.ClickedDay({ date: disabled })),
            Story.expectNoOutMessage(),
          )
        },
      )
    })

    describe('InformedOfDisabledDaysOfWeekChange', () => {
      it.effect('sets disabled days of the week', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(
            Message.InformedOfDisabledDaysOfWeekChange({
              disabledDaysOfWeek: ['Saturday', 'Sunday'],
            }),
          ),
          Story.model(model => {
            expect(model.disabledDaysOfWeek).toStrictEqual([
              'Saturday',
              'Sunday',
            ])
          }),
        ),
      )

      it.effect('replaces the list with an empty array', () =>
        Story.story(
          CalendarLive,
          { id: 'test', today, disabledDaysOfWeek: ['Sunday'] },
          Story.message(
            Message.InformedOfDisabledDaysOfWeekChange({
              disabledDaysOfWeek: [],
            }),
          ),
          Story.model(model => {
            expect(model.disabledDaysOfWeek).toStrictEqual([])
          }),
        ),
      )
    })
  })

  describe('RequestedFocusDate', () => {
    it.effect(
      'moves the view and cursor to a date without selecting it',
      () => {
        const date = Calendar.make(2026, 8, 15)
        return Story.story(
          CalendarLive,
          { id: 'test', today },
          Story.message(Message.RequestedFocusDate({ date })),
          Story.model(model => {
            expect(model.viewYear).toBe(2026)
            expect(model.viewMonth).toBe(8)
            expect(model.maybeFocusedDate).toStrictEqual(Option.some(date))
          }),
          Story.expectNoOutMessage(),
        )
      },
    )
  })

  describe('RequestedSelectDate', () => {
    it.effect('commits an enabled date and emits SelectedDate', () => {
      const date = Calendar.make(2026, 6, 5)
      return Story.story(
        CalendarLive,
        { id: 'test', today },
        Story.message(Message.RequestedSelectDate({ date })),
        Story.model(model => {
          expect(model.viewMonth).toBe(6)
          expect(model.maybeFocusedDate).toStrictEqual(Option.some(date))
        }),
        Story.expectOutMessage(OutMessage.SelectedDate({ date })),
      )
    })

    it.effect('ignores a disabled date', () => {
      const date = Calendar.make(2026, 4, 20)
      return Story.story(
        CalendarLive,
        { id: 'test', today, disabledDates: [date] },
        Story.message(Message.RequestedSelectDate({ date })),
        Story.expectNoOutMessage(),
      )
    })
  })
})
