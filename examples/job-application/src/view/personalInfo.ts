import { Equal, Option } from 'effect'
import { Ui } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { type Html, html } from 'foldkit/html'

import { PronounOption } from '../domain'
import { PersonalInfo } from '../step'
import {
  backdropClassName,
  calendarView,
  panelClassName,
  triggerClassName,
  triggerContent,
} from './datePicker'
import { inputField } from './field'
import { chevronDown } from './icon'

export const personalInfoView = <ParentMessage>(
  {
    firstName,
    lastName,
    email,
    phone,
    pronouns,
    customPronouns,
    portfolioUrl,
    availableDate,
  }: PersonalInfo.Model,
  toParentMessage: (message: PersonalInfo.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const isOtherSelected = Option.exists(
    pronouns.maybeSelectedItem,
    Equal.equals('Other'),
  )

  const selectedPronounLabel = Option.getOrElse(
    pronouns.maybeSelectedItem,
    () => 'Select pronouns',
  )

  return h.div(
    [h.Class('space-y-4')],
    [
      h.div(
        [h.Class('grid grid-cols-2 gap-4')],
        [
          inputField<ParentMessage>({
            id: 'first-name',
            label: 'First Name',
            field: firstName,
            onInput: value =>
              toParentMessage(PersonalInfo.UpdatedFirstName({ value })),
            placeholder: 'Jane',
          }),
          inputField<ParentMessage>({
            id: 'last-name',
            label: 'Last Name',
            field: lastName,
            onInput: value =>
              toParentMessage(PersonalInfo.UpdatedLastName({ value })),
            placeholder: 'Doe',
          }),
        ],
      ),
      inputField<ParentMessage>({
        id: 'email',
        label: 'Email',
        field: email,
        onInput: value => toParentMessage(PersonalInfo.UpdatedEmail({ value })),
        type: 'email',
        placeholder: 'jane@example.com',
      }),
      inputField<ParentMessage>({
        id: 'phone',
        label: 'Phone (optional)',
        field: phone,
        onInput: value => toParentMessage(PersonalInfo.UpdatedPhone({ value })),
        type: 'tel',
        placeholder: '+1 (555) 123-4567',
      }),
      h.div(
        [h.Class('space-y-1')],
        [
          h.label(
            [h.Class('block text-sm font-medium text-gray-700')],
            ['Pronouns (optional)'],
          ),
          Ui.Listbox.view({
            model: pronouns,
            toParentMessage: message =>
              toParentMessage(PersonalInfo.GotPronounsMessage({ message })),
            anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
            items: PronounOption.all,
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
                      Option.isSome(pronouns.maybeSelectedItem)
                        ? 'text-gray-900'
                        : 'text-gray-400',
                    ),
                  ],
                  [selectedPronounLabel],
                ),
                h.span(
                  [h.Class('text-gray-400')],
                  [chevronDown<ParentMessage>('w-4 h-4')],
                ),
              ],
            ),
            buttonAttributes: [
              h.Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ],
            itemsAttributes: [
              h.Class(
                'w-(--button-width) rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden',
              ),
            ],
            backdropAttributes: [h.Class('fixed inset-0')],
          }),
        ],
      ),
      ...(isOtherSelected
        ? [
            inputField<ParentMessage>({
              id: 'custom-pronouns',
              label: 'Custom Pronouns',
              field: Valid({ value: customPronouns }),
              onInput: value =>
                toParentMessage(PersonalInfo.UpdatedCustomPronouns({ value })),
              placeholder: 'Enter your pronouns',
            }),
          ]
        : []),
      inputField<ParentMessage>({
        id: 'portfolio-url',
        label: 'Portfolio URL (optional)',
        field: portfolioUrl,
        onInput: value =>
          toParentMessage(PersonalInfo.UpdatedPortfolioUrl({ value })),
        type: 'url',
      }),
      availableDatePicker<ParentMessage>(availableDate, toParentMessage),
    ],
  )
}

const availableDatePicker = <ParentMessage>(
  model: Ui.DatePicker.Model,
  toParentMessage: (message: PersonalInfo.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Available Start Date (optional)'],
      ),
      Ui.DatePicker.view({
        model,
        toParentMessage: message =>
          toParentMessage(PersonalInfo.GotAvailableDateMessage({ message })),
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        triggerContent: maybeDate =>
          triggerContent<ParentMessage>(maybeDate, 'Pick a date'),
        triggerClassName,
        panelClassName,
        backdropClassName,
        toCalendarView: calendarView,
      }),
    ],
  )
}
