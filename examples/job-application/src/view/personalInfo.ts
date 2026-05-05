import { Equal, Option } from 'effect'
import { Ui } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { type Html } from 'foldkit/html'

import { PronounOption } from '../domain'
import { Class, div, label, span } from '../html'
import type { Message } from '../message'
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

export const personalInfoView = (
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
  toParentMessage: (message: PersonalInfo.Message) => Message,
): Html => {
  const isOtherSelected = Option.exists(
    pronouns.maybeSelectedItem,
    Equal.equals('Other'),
  )

  const selectedPronounLabel = Option.getOrElse(
    pronouns.maybeSelectedItem,
    () => 'Select pronouns',
  )

  return div(
    [Class('space-y-4')],
    [
      div(
        [Class('grid grid-cols-2 gap-4')],
        [
          inputField({
            id: 'first-name',
            label: 'First Name',
            field: firstName,
            onInput: value =>
              toParentMessage(PersonalInfo.UpdatedFirstName({ value })),
            placeholder: 'Jane',
          }),
          inputField({
            id: 'last-name',
            label: 'Last Name',
            field: lastName,
            onInput: value =>
              toParentMessage(PersonalInfo.UpdatedLastName({ value })),
            placeholder: 'Doe',
          }),
        ],
      ),
      inputField({
        id: 'email',
        label: 'Email',
        field: email,
        onInput: value => toParentMessage(PersonalInfo.UpdatedEmail({ value })),
        type: 'email',
        placeholder: 'jane@example.com',
      }),
      inputField({
        id: 'phone',
        label: 'Phone (optional)',
        field: phone,
        onInput: value => toParentMessage(PersonalInfo.UpdatedPhone({ value })),
        type: 'tel',
        placeholder: '+1 (555) 123-4567',
      }),
      div(
        [Class('space-y-1')],
        [
          label(
            [Class('block text-sm font-medium text-gray-700')],
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
              content: div(
                [Class('flex items-center gap-2')],
                [
                  span(
                    [
                      Class(
                        `w-4 text-indigo-600 ${isSelected ? 'visible' : 'invisible'}`,
                      ),
                    ],
                    ['\u2713'],
                  ),
                  span([], [pronoun]),
                ],
              ),
            }),
            buttonContent: div(
              [Class('flex w-full items-center justify-between gap-2')],
              [
                span(
                  [
                    Class(
                      Option.isSome(pronouns.maybeSelectedItem)
                        ? 'text-gray-900'
                        : 'text-gray-400',
                    ),
                  ],
                  [selectedPronounLabel],
                ),
                span([Class('text-gray-400')], [chevronDown('w-4 h-4')]),
              ],
            ),
            buttonAttributes: [
              Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ],
            itemsAttributes: [
              Class(
                'w-(--button-width) rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden',
              ),
            ],
            backdropAttributes: [Class('fixed inset-0')],
          }),
        ],
      ),
      ...(isOtherSelected
        ? [
            inputField({
              id: 'custom-pronouns',
              label: 'Custom Pronouns',
              field: Valid({ value: customPronouns }),
              onInput: value =>
                toParentMessage(PersonalInfo.UpdatedCustomPronouns({ value })),
              placeholder: 'Enter your pronouns',
            }),
          ]
        : []),
      inputField({
        id: 'portfolio-url',
        label: 'Portfolio URL (optional)',
        field: portfolioUrl,
        onInput: value =>
          toParentMessage(PersonalInfo.UpdatedPortfolioUrl({ value })),
        type: 'url',
      }),
      availableDatePicker(availableDate, toParentMessage),
    ],
  )
}

const availableDatePicker = (
  model: Ui.DatePicker.Model,
  toParentMessage: (message: PersonalInfo.Message) => Message,
): Html =>
  div(
    [Class('space-y-1')],
    [
      label(
        [Class('block text-sm font-medium text-gray-700')],
        ['Available Start Date (optional)'],
      ),
      Ui.DatePicker.view({
        model,
        toParentMessage: message =>
          toParentMessage(PersonalInfo.GotAvailableDateMessage({ message })),
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        triggerContent: maybeDate => triggerContent(maybeDate, 'Pick a date'),
        triggerClassName,
        panelClassName,
        backdropClassName,
        toCalendarView: calendarView,
      }),
    ],
  )
