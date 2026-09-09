import { Equal, Option } from 'effect'
import { Submodel } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { Valid } from 'foldkit/fieldValidation'
import { type Html, type HtmlBuilder, childAttributes } from 'foldkit/html'

import { DatePicker as UiDatePicker } from '@foldkit/ui'

import { PronounOption } from '../../domain'
import { DatePicker, Field, Icon } from '../../view'
import { Message, type Model, PronounsListbox } from './personalInfo'

export const view = Submodel.defineView<Model, Message>((model, h): Html => {
  const {
    firstName,
    lastName,
    email,
    phone,
    pronouns,
    maybeSelectedPronoun,
    customPronouns,
    portfolioUrl,
    availableDate,
  } = model

  const isOtherSelected = Option.exists(
    maybeSelectedPronoun,
    Equal.equals('Other'),
  )

  const selectedPronounLabel = Option.getOrElse(
    maybeSelectedPronoun,
    () => 'Select pronouns',
  )

  return h.div(
    [h.Class('space-y-4')],
    [
      h.div(
        [h.Class('grid grid-cols-2 gap-4')],
        [
          Field.input(
            {
              id: 'first-name',
              label: 'First Name',
              field: firstName,
              onInput: value => Message.UpdatedFirstName({ value }),
              placeholder: 'Jane',
            },
            h,
          ),
          Field.input(
            {
              id: 'last-name',
              label: 'Last Name',
              field: lastName,
              onInput: value => Message.UpdatedLastName({ value }),
              placeholder: 'Doe',
            },
            h,
          ),
        ],
      ),
      Field.input(
        {
          id: 'email',
          label: 'Email',
          field: email,
          onInput: value => Message.UpdatedEmail({ value }),
          type: 'email',
          placeholder: 'jane@example.com',
        },
        h,
      ),
      Field.input(
        {
          id: 'phone',
          label: 'Phone (optional)',
          field: phone,
          onInput: value => Message.UpdatedPhone({ value }),
          type: 'tel',
          placeholder: '+1 (555) 123-4567',
        },
        h,
      ),
      h.div(
        [h.Class('space-y-1')],
        [
          h.label(
            [h.Class('block text-sm font-medium text-gray-700')],
            ['Pronouns (optional)'],
          ),
          h.submodel({
            slotId: pronouns.id,
            model: pronouns,
            view: PronounsListbox.view,
            viewInputs: {
              anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
              items: PronounOption.all,
              maybeSelectedValue: maybeSelectedPronoun,
              itemToConfig: (pronoun, { isSelected }) => ({
                className:
                  'px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 data-[active]:bg-indigo-50',
                content: h.div(
                  [h.Class('flex items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          `w-4 text-indigo-600 ${isSelected ? 'visible' : 'invisible'}`,
                        ),
                      ],
                      ['✓'],
                    ),
                    h.span([], [pronoun]),
                  ],
                ),
              }),
              buttonContent: h.div(
                [h.Class('flex w-full items-center justify-between gap-2')],
                [
                  h.span(
                    [
                      h.Class(
                        Option.match(maybeSelectedPronoun, {
                          onNone: () => 'text-gray-400',
                          onSome: () => 'text-gray-900',
                        }),
                      ),
                    ],
                    [selectedPronounLabel],
                  ),
                  h.span(
                    [h.Class('text-gray-400')],
                    [Icon.chevronDown('w-4 h-4')],
                  ),
                ],
              ),
              buttonAttributes: childAttributes([
                h.Class(
                  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
                ),
              ]),
              itemsAttributes: childAttributes([
                h.Class(
                  'w-(--button-width) rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden',
                ),
              ]),
              backdropAttributes: childAttributes([h.Class('fixed inset-0')]),
            },
            toParentMessage: message => Message.GotPronounsMessage({ message }),
          }),
        ],
      ),
      ...(isOtherSelected
        ? [
            Field.input(
              {
                id: 'custom-pronouns',
                label: 'Custom Pronouns',
                field: Valid({ value: customPronouns }),
                onInput: value => Message.UpdatedCustomPronouns({ value }),
                placeholder: 'Enter your pronouns',
              },
              h,
            ),
          ]
        : []),
      Field.input(
        {
          id: 'portfolio-url',
          label: 'Portfolio URL (optional)',
          field: portfolioUrl,
          onInput: value => Message.UpdatedPortfolioUrl({ value }),
          type: 'url',
        },
        h,
      ),
      availableDatePickerView(availableDate, model.maybeAvailableDate, h),
    ],
  )
})

const availableDatePickerView = (
  model: UiDatePicker.Model,
  maybeSelectedDate: Option.Option<CalendarDate>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Available Start Date (optional)'],
      ),
      h.submodel({
        slotId: model.id,
        model,
        view: UiDatePicker.view,
        viewInputs: {
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          maybeSelectedDate,
          triggerContent: maybeDate =>
            DatePicker.triggerContent(maybeDate, 'Pick a date'),
          triggerClassName: DatePicker.triggerClassName,
          panelClassName: DatePicker.panelClassName,
          backdropClassName: DatePicker.backdropClassName,
          toCalendarView: DatePicker.calendarView,
        },
        toParentMessage: message =>
          Message.GotAvailableDateMessage({ message }),
      }),
    ],
  )
