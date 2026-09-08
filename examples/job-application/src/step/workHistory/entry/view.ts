import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button, DatePicker as UiDatePicker } from '@foldkit/ui'

import { DatePicker, Field } from '../../../view'
import { Message, type Model } from './entry'

const ANCHOR = { placement: 'bottom-start' as const, gap: 4, padding: 8 }

export const view = Submodel.defineView<Model, Message>((model, h): Html => {
  const showEndDate = !model.isCurrentlyEmployed

  const startDatePicker = h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Start Date'],
      ),
      h.submodel({
        slotId: model.startDate.id,
        model: model.startDate,
        view: UiDatePicker.view,
        viewInputs: {
          anchor: ANCHOR,
          maybeSelectedDate: model.maybeStartDate,
          triggerContent: maybeDate =>
            DatePicker.triggerContent(maybeDate, 'Select start date'),
          toCalendarView: DatePicker.calendarView,
          triggerClassName: DatePicker.triggerClassName,
          panelClassName: DatePicker.panelClassName,
          backdropClassName: DatePicker.backdropClassName,
        },
        toParentMessage: message => Message.GotStartDateMessage({ message }),
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
        view: UiDatePicker.view,
        viewInputs: {
          anchor: ANCHOR,
          maybeSelectedDate: model.maybeEndDate,
          triggerContent: maybeDate =>
            DatePicker.triggerContent(maybeDate, 'Select end date'),
          toCalendarView: DatePicker.calendarView,
          triggerClassName: DatePicker.triggerClassName,
          panelClassName: DatePicker.panelClassName,
          backdropClassName: DatePicker.backdropClassName,
        },
        toParentMessage: message => Message.GotEndDateMessage({ message }),
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
          Field.input(
            {
              id: `${model.id}-company`,
              label: 'Company',
              field: model.company,
              onInput: value => Message.UpdatedCompany({ value }),
              placeholder: 'e.g. Acme Corp',
            },
            h,
          ),
          Field.input(
            {
              id: `${model.id}-title`,
              label: 'Job Title',
              field: model.title,
              onInput: value => Message.UpdatedTitle({ value }),
              placeholder: 'e.g. Senior Engineer',
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('grid grid-cols-2 gap-3')],
        [startDatePicker, ...(showEndDate ? [endDatePicker] : [])],
      ),
      Field.checkbox(
        {
          id: `${model.id}-current`,
          label: 'I currently work here',
          isChecked: model.isCurrentlyEmployed,
          onToggle: isChecked =>
            Message.ToggledCurrentlyEmployed({ isChecked }),
        },
        h,
      ),
      Field.textarea(
        {
          id: `${model.id}-description`,
          label: 'Description',
          value: model.description,
          onInput: value => Message.UpdatedDescription({ value }),
          rows: 3,
          placeholder: 'Describe your role and key accomplishments...',
        },
        h,
      ),
      h.div(
        [h.Class('flex justify-end')],
        [
          Button.view(
            {
              onClick: Message.ClickedRemoveSelf(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
                    ),
                  ],
                  ['Remove position'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
})
