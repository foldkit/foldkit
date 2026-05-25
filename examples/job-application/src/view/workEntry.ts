import { Submodel, Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

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

export const workEntryView = Submodel.defineView<
  WorkHistory.Entry.Model,
  WorkHistory.Entry.Message
>((model): Html => {
  const h = html<WorkHistory.Entry.Message>()

  const showEndDate = !model.isCurrentlyEmployed.isChecked

  const startDatePicker = h.keyed('div')(
    `${model.id}-start-date`,
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Start Date'],
      ),
      h.submodel({
        slotId: model.startDate.id,
        model: model.startDate,
        view: Ui.DatePicker.view,
        viewInputs: {
          anchor: ANCHOR,
          triggerContent: maybeDate =>
            triggerContent(maybeDate, 'Select start date'),
          toCalendarView: calendarView,
          triggerClassName,
          panelClassName,
          backdropClassName,
        },
        toParentMessage: message =>
          WorkHistory.Entry.GotStartDateMessage({ message }),
      }),
    ],
  )

  const endDatePicker = h.keyed('div')(
    `${model.id}-end-date`,
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['End Date'],
      ),
      h.submodel({
        slotId: model.endDate.id,
        model: model.endDate,
        view: Ui.DatePicker.view,
        viewInputs: {
          anchor: ANCHOR,
          triggerContent: maybeDate =>
            triggerContent(maybeDate, 'Select end date'),
          toCalendarView: calendarView,
          triggerClassName,
          panelClassName,
          backdropClassName,
        },
        toParentMessage: message =>
          WorkHistory.Entry.GotEndDateMessage({ message }),
      }),
    ],
  )

  return h.keyed('div')(
    model.id,
    [h.Class('py-6 space-y-4 first:pt-0')],
    [
      h.div(
        [h.Class('grid grid-cols-2 gap-3')],
        [
          inputField<WorkHistory.Entry.Message>({
            id: `${model.id}-company`,
            label: 'Company',
            field: model.company,
            onInput: value => WorkHistory.Entry.UpdatedCompany({ value }),
            placeholder: 'e.g. Acme Corp',
          }),
          inputField<WorkHistory.Entry.Message>({
            id: `${model.id}-title`,
            label: 'Job Title',
            field: model.title,
            onInput: value => WorkHistory.Entry.UpdatedTitle({ value }),
            placeholder: 'e.g. Senior Engineer',
          }),
        ],
      ),
      h.div(
        [h.Class('grid grid-cols-2 gap-3')],
        [startDatePicker, ...(showEndDate ? [endDatePicker] : [])],
      ),
      h.submodel({
        slotId: `${model.id}-currently-employed`,
        model: model.isCurrentlyEmployed,
        view: Ui.Checkbox.view,
        viewInputs: {
          toView: attributes =>
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.div(
                  [
                    ...attributes.checkbox,
                    h.Class(
                      `flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer ${
                        model.isCurrentlyEmployed.isChecked
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-gray-300'
                      }`,
                    ),
                  ],
                  [
                    ...(model.isCurrentlyEmployed.isChecked
                      ? [h.span([h.Class('text-white text-xs')], ['✓'])]
                      : []),
                  ],
                ),
                h.label(
                  [
                    ...attributes.label,
                    h.Class('text-sm text-gray-700 select-none cursor-pointer'),
                  ],
                  ['I currently work here'],
                ),
              ],
            ),
        },
        toParentMessage: message =>
          WorkHistory.Entry.GotIsCurrentlyEmployedMessage({ message }),
      }),
      textareaField<WorkHistory.Entry.Message>({
        id: `${model.id}-description`,
        label: 'Description',
        value: model.description,
        onInput: value => WorkHistory.Entry.UpdatedDescription({ value }),
        rows: 3,
        placeholder: 'Describe your role and key accomplishments...',
      }),
      h.div(
        [h.Class('flex justify-end')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(WorkHistory.Entry.ClickedRemoveSelf()),
              h.Class(
                'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
              ),
            ],
            ['Remove position'],
          ),
        ],
      ),
    ],
  )
})
