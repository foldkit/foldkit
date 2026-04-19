import { Ui } from 'foldkit'
import { type Html } from 'foldkit/html'

import { Class, OnClick, Type, button, div, keyed, label, span } from '../html'
import { GotWorkHistoryMessage } from '../message'
import { WorkHistory } from '../step'
import {
  backdropClassName,
  calendarView,
  panelClassName,
  triggerClassName,
  triggerContent,
} from './datePicker'
import { inputField, textareaField } from './field'

const ANCHOR = { placement: 'bottom-start' as const, gap: 4, padding: 8 }

export const workEntryView = (model: WorkHistory.Entry.Model): Html => {
  const toEntryMessage = (message: WorkHistory.Entry.Message) =>
    GotWorkHistoryMessage({
      message: WorkHistory.GotEntryMessage({ entryId: model.id, message }),
    })

  const showEndDate = !model.isCurrentlyEmployed.isChecked

  const startDatePicker = keyed('div')(
    `${model.id}-start-date`,
    [Class('space-y-1')],
    [
      label([Class('block text-sm font-medium text-gray-700')], ['Start Date']),
      Ui.DatePicker.view({
        model: model.startDate,
        toParentMessage: message =>
          toEntryMessage(WorkHistory.Entry.GotStartDateMessage({ message })),
        onSelectedDate: date =>
          toEntryMessage(WorkHistory.Entry.SelectedStartDate({ date })),
        anchor: ANCHOR,
        triggerContent: maybeDate =>
          triggerContent(maybeDate, 'Select start date'),
        toCalendarView: calendarView,
        triggerClassName,
        panelClassName,
        backdropClassName,
      }),
    ],
  )

  const endDatePicker = keyed('div')(
    `${model.id}-end-date`,
    [Class('space-y-1')],
    [
      label([Class('block text-sm font-medium text-gray-700')], ['End Date']),
      Ui.DatePicker.view({
        model: model.endDate,
        toParentMessage: message =>
          toEntryMessage(WorkHistory.Entry.GotEndDateMessage({ message })),
        onSelectedDate: date =>
          toEntryMessage(WorkHistory.Entry.SelectedEndDate({ date })),
        anchor: ANCHOR,
        triggerContent: maybeDate =>
          triggerContent(maybeDate, 'Select end date'),
        toCalendarView: calendarView,
        triggerClassName,
        panelClassName,
        backdropClassName,
      }),
    ],
  )

  return keyed('div')(
    model.id,
    [Class('py-6 space-y-4 first:pt-0')],
    [
      div(
        [Class('grid grid-cols-2 gap-3')],
        [
          inputField({
            id: `${model.id}-company`,
            label: 'Company',
            field: model.company,
            onInput: value =>
              toEntryMessage(WorkHistory.Entry.UpdatedCompany({ value })),
            placeholder: 'e.g. Acme Corp',
          }),
          inputField({
            id: `${model.id}-title`,
            label: 'Job Title',
            field: model.title,
            onInput: value =>
              toEntryMessage(WorkHistory.Entry.UpdatedTitle({ value })),
            placeholder: 'e.g. Senior Engineer',
          }),
        ],
      ),
      div(
        [Class('grid grid-cols-2 gap-3')],
        [startDatePicker, ...(showEndDate ? [endDatePicker] : [])],
      ),
      Ui.Checkbox.view({
        model: model.isCurrentlyEmployed,
        toParentMessage: message =>
          toEntryMessage(
            WorkHistory.Entry.GotIsCurrentlyEmployedMessage({ message }),
          ),
        toView: attributes =>
          div(
            [Class('flex items-center gap-2')],
            [
              div(
                [
                  ...attributes.checkbox,
                  Class(
                    `flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer ${
                      model.isCurrentlyEmployed.isChecked
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-300'
                    }`,
                  ),
                ],
                [
                  ...(model.isCurrentlyEmployed.isChecked
                    ? [span([Class('text-white text-xs')], ['\u2713'])]
                    : []),
                ],
              ),
              label(
                [
                  ...attributes.label,
                  Class('text-sm text-gray-700 select-none cursor-pointer'),
                ],
                ['I currently work here'],
              ),
            ],
          ),
      }),
      textareaField({
        id: `${model.id}-description`,
        label: 'Description',
        value: model.description,
        onInput: value =>
          toEntryMessage(WorkHistory.Entry.UpdatedDescription({ value })),
        rows: 3,
        placeholder: 'Describe your role and key accomplishments...',
      }),
      div(
        [Class('flex justify-end')],
        [
          button(
            [
              Type('button'),
              OnClick(
                GotWorkHistoryMessage({
                  message: WorkHistory.RemovedEntry({ entryId: model.id }),
                }),
              ),
              Class(
                'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
              ),
            ],
            ['Remove position'],
          ),
        ],
      ),
    ],
  )
}
