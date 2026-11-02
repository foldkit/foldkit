import { Option, Tuple } from 'effect'
import * as Calendar from 'foldkit/calendar'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as UiCalendar from '../calendar/block.js'
import * as Popover from '../popover/block.js'
import {
  CalendarBinding,
  DatePickerBlock,
  Message,
  OutMessage,
  PopoverBinding,
  layer,
} from './block.js'

const today = Calendar.make(2026, 4, 13)

const givenClosed = Story.init({ id: 'picker', today })

const givenOpen = Tuple.make(Story.message(Message.Opened()))

it.layer(layer, { buildPerTest: true })(it => {
  describe('DatePicker', () => {
    describe('init', () => {
      it.effect('defaults to a closed popover with contentFocus enabled', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const model = datePicker.init({ id: 'picker', today }).model
          expect(model.id).toBe('picker')
          expect(model.popover.isOpen).toBe(false)
          expect(model.popover.contentFocus).toBe(true)
          expect(model.popover.id).toBe('picker-popover')
          expect(model.calendar.id).toBe('picker-calendar')
        }),
      )

      it.effect('seeds the calendar view month from initialViewDate', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const initialViewDate = Calendar.make(2026, 5, 2)
          const model = datePicker.init({
            id: 'picker',
            today,
            initialViewDate,
          }).model
          expect(model.calendar.viewMonth).toBe(5)
        }),
      )

      it.effect('propagates isAnimated to the popover block', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const model = datePicker.init({
            id: 'picker',
            today,
            isAnimated: true,
          }).model
          expect(model.popover.isAnimated).toBe(true)
        }),
      )

      it.effect(
        'propagates min/max and disabled config to the calendar block',
        () =>
          Story.withBlock(DatePickerBlock, datePicker => {
            const minDate = Calendar.make(2026, 1, 1)
            const maxDate = Calendar.make(2026, 12, 31)
            const model = datePicker.init({
              id: 'picker',
              today,
              minDate,
              maxDate,
              disabledDaysOfWeek: ['Sunday'],
            }).model
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

    describe('update', () => {
      describe('Opened', () => {
        it.effect('opens the popover', () =>
          Story.story(
            DatePickerBlock,
            givenClosed,
            Story.message(Message.Opened()),
            Story.model(model => {
              expect(model.popover.isOpen).toBe(true)
            }),
            Story.expectNoOutMessage(),
          ),
        )

        it.effect('does not dispatch focus commands when opening', () =>
          Story.story(
            DatePickerBlock,
            givenClosed,
            Story.message(Message.Opened()),
            Story.Command.expectNone(),
          ),
        )

        it.effect(
          'drops the calendar back to Days mode if a previous session left it drilled into Months or Years',
          () =>
            Story.story(
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedHeading(),
              ),
              Story.Command.resolve(
                UiCalendar.FocusGrid,
                UiCalendar.Message.CompletedFocusGrid(),
              ),
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedHeading(),
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
                Popover.FocusPopoverButton,
                Popover.Message.CompletedFocusPopoverButton(),
              ),
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
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.message(Message.Closed()),
              Story.Command.resolve(
                Popover.FocusPopoverButton,
                Popover.Message.CompletedFocusPopoverButton(),
              ),
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
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedHeading(),
              ),
              Story.Command.resolve(
                UiCalendar.FocusGrid,
                UiCalendar.Message.CompletedFocusGrid(),
              ),
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedHeading(),
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
                Popover.FocusPopoverButton,
                Popover.Message.CompletedFocusPopoverButton(),
              ),
              Story.model(model => {
                expect(model.calendar.viewMode).toBe('Days')
              }),
            ),
        )

        it.effect(
          'reconciles the calendar focus after Years-mode paging so reopening does not drift the day grid',
          () =>
            Story.story(
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedHeading(),
              ),
              Story.Command.resolve(
                UiCalendar.FocusGrid,
                UiCalendar.Message.CompletedFocusGrid(),
              ),
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedHeading(),
              ),
              Story.Command.resolve(
                UiCalendar.FocusGrid,
                UiCalendar.Message.CompletedFocusGrid(),
              ),
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.PagedYears({ direction: 1 }),
              ),
              Story.message(Message.Closed()),
              Story.Command.resolve(
                Popover.FocusPopoverButton,
                Popover.Message.CompletedFocusPopoverButton(),
              ),
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

      describe('RequestedSelectDate', () => {
        it.effect(
          'commits the date, closes the popover, and emits SelectedDate',
          () => {
            const target = Calendar.make(2026, 4, 20)
            return Story.story(
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.message(Message.RequestedSelectDate({ date: target })),
              Story.expectOutMessage(OutMessage.SelectedDate({ date: target })),
              Story.Command.resolve(
                Popover.FocusPopoverButton,
                Popover.Message.CompletedFocusPopoverButton(),
              ),
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
          () => {
            const target = Calendar.make(2026, 6, 5)
            return Story.story(
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.message(Message.RequestedSelectDate({ date: target })),
              Story.Command.resolve(
                Popover.FocusPopoverButton,
                Popover.Message.CompletedFocusPopoverButton(),
              ),
              Story.model(model => {
                expect(model.calendar.viewYear).toBe(2026)
                expect(model.calendar.viewMonth).toBe(6)
              }),
            )
          },
        )
      })

      describe('Cleared', () => {
        it.effect('emits ClearedDate without closing the popover', () =>
          Story.withBlock(DatePickerBlock, datePicker => {
            const seeded = datePicker.init({
              id: 'picker',
              today,
              initialViewDate: Calendar.make(2026, 4, 20),
            }).model
            Story.story(
              datePicker.update,
              Story.steps(Story.given(seeded), Story.message(Message.Opened())),
              Story.message(Message.Cleared()),
              Story.Command.expectNone(),
              Story.model(model => {
                expect(model.popover.isOpen).toBe(true)
              }),
              Story.expectOutMessage(OutMessage.ClearedDate()),
            )
          }),
        )
      })

      describe('GotCalendarMessage', () => {
        it.effect(
          'propagates Calendar ChangedViewMonth as DatePicker ChangedViewMonth',
          () =>
            Story.story(
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.messageFrom(
                CalendarBinding,
                UiCalendar.Message.ClickedNextMonthButton(),
              ),
              Story.model(model => {
                expect(model.calendar.viewMonth).toBe(5)
              }),
              Story.expectOutMessage(
                OutMessage.ChangedViewMonth({ year: 2026, month: 5 }),
              ),
            ),
        )

        it.effect(
          'passes keyboard navigation through to the calendar grid',
          () =>
            Story.story(
              DatePickerBlock,
              Story.init({ id: 'picker', today }),
              ...givenOpen,
              Story.messageFrom(
                CalendarBinding,
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

      describe('GotPopoverMessage', () => {
        it.effect('routes popover messages through the popover update', () =>
          Story.story(
            DatePickerBlock,
            Story.init({ id: 'picker', today }),
            ...givenOpen,
            Story.messageFrom(PopoverBinding, Popover.Message.PressedEscape()),
            Story.Command.resolve(
              Popover.FocusPopoverButton,
              Popover.Message.CompletedFocusPopoverButton(),
            ),
            Story.model(model => {
              expect(model.popover.isOpen).toBe(false)
            }),
          ),
        )
      })
    })

    describe('programmatic helpers', () => {
      it.effect('open(model) behaves like dispatching Opened', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const model = datePicker.init({ id: 'picker', today }).model
          const pickerOpen = datePicker.operations.requestOpen(model)
          expect(pickerOpen.model.popover.isOpen).toBe(true)
        }),
      )

      it.effect('close(model) behaves like dispatching Closed', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const pickerOpen = datePicker.operations.requestOpen(
            datePicker.init({ id: 'picker', today }).model,
          )
          const pickerClose = datePicker.operations.requestClose(
            pickerOpen.model,
          )
          expect(pickerClose.model.popover.isOpen).toBe(false)
          expect((pickerClose.commands ?? []).length).toBeGreaterThan(0)
        }),
      )

      it.effect(
        'selectDate(model, date) commits the date, closes the popover, and emits SelectedDate',
        () =>
          Story.withBlock(DatePickerBlock, datePicker => {
            const target = Calendar.make(2026, 4, 20)
            const pickerOpen = datePicker.operations.requestOpen(
              datePicker.init({ id: 'picker', today }).model,
            )
            const dateSelection = datePicker.operations.requestSelectDate(
              pickerOpen.model,
              target,
            )
            expect(dateSelection.model.popover.isOpen).toBe(false)
            expect(dateSelection.outMessage).toStrictEqual(
              OutMessage.SelectedDate({ date: target }),
            )
          }),
      )

      it.effect('clear(model) emits ClearedDate', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const seeded = datePicker.init({
            id: 'picker',
            today,
            initialViewDate: Calendar.make(2026, 4, 20),
          }).model
          const selectionClear = datePicker.operations.requestClear(seeded)
          expect(selectionClear.outMessage).toStrictEqual(
            OutMessage.ClearedDate(),
          )
        }),
      )

      it.effect('informMinDateChanged forwards to the embedded calendar', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const model = datePicker.init({ id: 'picker', today }).model
          const newMin = Calendar.make(2026, 5, 1)
          const minDateChange = datePicker.operations.informMinDateChanged(
            model,
            Option.some(newMin),
          )
          expect(minDateChange.model.calendar.maybeMinDate).toStrictEqual(
            Option.some(newMin),
          )
        }),
      )

      it.effect('informMinDateChanged clears the minimum', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const model = datePicker.init({
            id: 'picker',
            today,
            minDate: Calendar.make(2026, 1, 1),
          }).model
          const minDateChange = datePicker.operations.informMinDateChanged(
            model,
            Option.none(),
          )
          expect(minDateChange.model.calendar.maybeMinDate).toStrictEqual(
            Option.none(),
          )
        }),
      )

      it.effect('informMaxDateChanged forwards to the embedded calendar', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const model = datePicker.init({ id: 'picker', today }).model
          const newMax = Calendar.make(2026, 12, 31)
          const maxDateChange = datePicker.operations.informMaxDateChanged(
            model,
            Option.some(newMax),
          )
          expect(maxDateChange.model.calendar.maybeMaxDate).toStrictEqual(
            Option.some(newMax),
          )
        }),
      )

      it.effect(
        'informDisabledDatesChanged forwards to the embedded calendar',
        () =>
          Story.withBlock(DatePickerBlock, datePicker => {
            const model = datePicker.init({ id: 'picker', today }).model
            const disabled = [Calendar.make(2026, 4, 15)]
            const disabledDatesChange =
              datePicker.operations.informDisabledDatesChanged(model, disabled)
            expect(
              disabledDatesChange.model.calendar.disabledDates,
            ).toStrictEqual(disabled)
          }),
      )

      it.effect(
        'informDisabledDaysOfWeekChanged forwards to the embedded calendar',
        () =>
          Story.withBlock(DatePickerBlock, datePicker => {
            const model = datePicker.init({ id: 'picker', today }).model
            const disabledDaysChange =
              datePicker.operations.informDisabledDaysOfWeekChanged(model, [
                'Saturday',
                'Sunday',
              ])
            expect(
              disabledDaysChange.model.calendar.disabledDaysOfWeek,
            ).toStrictEqual(['Saturday', 'Sunday'])
          }),
      )
    })

    describe('focusDate', () => {
      it.effect('moves the embedded calendar view and cursor to a date', () =>
        Story.withBlock(DatePickerBlock, datePicker => {
          const date = Calendar.make(2026, 8, 15)
          const dateFocus = datePicker.operations.requestFocusDate(
            datePicker.init({ id: 'picker', today }).model,
            date,
          )
          expect(dateFocus.model.calendar.viewYear).toBe(2026)
          expect(dateFocus.model.calendar.viewMonth).toBe(8)
          expect(dateFocus.model.calendar.maybeFocusedDate).toStrictEqual(
            Option.some(date),
          )
        }),
      )
    })
  })
})
