import { Equal, Option } from 'effect'
import { Submodel, Ui } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { type Html, childAttributes, html } from 'foldkit/html'

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

const PronounsListbox = Ui.Listbox.create<string>()

export const personalInfoView = Submodel.defineView<
  PersonalInfo.Model,
  PersonalInfo.Message
>((model): Html => {
  const h = html<PersonalInfo.Message>()

  const {
    firstName,
    lastName,
    email,
    phone,
    pronouns,
    customPronouns,
    portfolioUrl,
    availableDate,
  } = model

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
          inputField<PersonalInfo.Message>({
            id: 'first-name',
            label: 'First Name',
            field: firstName,
            onInput: value => PersonalInfo.UpdatedFirstName({ value }),
            placeholder: 'Jane',
          }),
          inputField<PersonalInfo.Message>({
            id: 'last-name',
            label: 'Last Name',
            field: lastName,
            onInput: value => PersonalInfo.UpdatedLastName({ value }),
            placeholder: 'Doe',
          }),
        ],
      ),
      inputField<PersonalInfo.Message>({
        id: 'email',
        label: 'Email',
        field: email,
        onInput: value => PersonalInfo.UpdatedEmail({ value }),
        type: 'email',
        placeholder: 'jane@example.com',
      }),
      inputField<PersonalInfo.Message>({
        id: 'phone',
        label: 'Phone (optional)',
        field: phone,
        onInput: value => PersonalInfo.UpdatedPhone({ value }),
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
          h.submodel({
            slotId: pronouns.id,
            model: pronouns,
            view: PronounsListbox.view,
            viewInputs: {
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
                  h.span([h.Class('text-gray-400')], [chevronDown('w-4 h-4')]),
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
            toParentMessage: message =>
              PersonalInfo.GotPronounsMessage({ message }),
          }),
        ],
      ),
      ...(isOtherSelected
        ? [
            inputField<PersonalInfo.Message>({
              id: 'custom-pronouns',
              label: 'Custom Pronouns',
              field: Valid({ value: customPronouns }),
              onInput: value => PersonalInfo.UpdatedCustomPronouns({ value }),
              placeholder: 'Enter your pronouns',
            }),
          ]
        : []),
      inputField<PersonalInfo.Message>({
        id: 'portfolio-url',
        label: 'Portfolio URL (optional)',
        field: portfolioUrl,
        onInput: value => PersonalInfo.UpdatedPortfolioUrl({ value }),
        type: 'url',
      }),
      availableDatePickerView(availableDate),
    ],
  )
})

const availableDatePickerView = (model: Ui.DatePicker.Model): Html => {
  const h = html<PersonalInfo.Message>()

  return h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Available Start Date (optional)'],
      ),
      h.submodel({
        slotId: model.id,
        model,
        view: Ui.DatePicker.view,
        viewInputs: {
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          triggerContent: maybeDate => triggerContent(maybeDate, 'Pick a date'),
          triggerClassName,
          panelClassName,
          backdropClassName,
          toCalendarView: calendarView,
        },
        toParentMessage: message =>
          PersonalInfo.GotAvailableDateMessage({ message }),
      }),
    ],
  )
}
