import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Submodel } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Field, Icon } from '../../../view'
import { GraduationYearListbox, Message, type Model } from './entry'

const GRADUATION_YEAR_WINDOW_SIZE = 30
const GRADUATION_YEAR_FORWARD_OFFSET = 6

const graduationYears = (today: CalendarDate): ReadonlyArray<string> =>
  Array.makeBy(GRADUATION_YEAR_WINDOW_SIZE, index =>
    String(today.year + GRADUATION_YEAR_FORWARD_OFFSET - index),
  )

export type ViewInputs = Readonly<{
  today: CalendarDate
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { today } = viewInputs

    const showGraduationYear = !model.isCurrentlyEnrolled

    const graduationYearField = h.keyed('div')(
      `${model.id}-graduation-year`,
      [h.Class('space-y-1')],
      [
        h.label(
          [h.Class('block text-sm font-medium text-gray-700')],
          ['Graduation Year'],
        ),
        h.submodel({
          slotId: model.graduationYearListbox.id,
          model: model.graduationYearListbox,
          view: GraduationYearListbox.view,
          viewInputs: {
            items: graduationYears(today),
            maybeSelectedValue: model.maybeGraduationYear,
            buttonContent: h.div(
              [h.Class('flex w-full items-center justify-between gap-2')],
              [
                Option.match(model.maybeGraduationYear, {
                  onNone: () =>
                    h.span([h.Class('text-gray-400')], ['Select year']),
                  onSome: graduationYear => h.span([], [graduationYear]),
                }),
                h.span(
                  [h.Class('text-gray-400 shrink-0')],
                  [Icon.chevronDown()],
                ),
              ],
            ),
            buttonClassName:
              'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500',
            itemsClassName:
              'rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-64 overflow-y-auto w-(--button-width)',
            itemToConfig: (year, { isActive, isSelected }) => ({
              className: clsx(
                'flex items-center gap-2 px-4 py-2 text-sm cursor-pointer',
                isActive && 'bg-gray-50',
                isSelected && 'text-indigo-700 font-semibold',
              ),
              content: h.div(
                [h.Class('flex items-center gap-2 w-full')],
                [
                  isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')]),
                  h.span([], [year]),
                ],
              ),
            }),
            backdropClassName: 'fixed inset-0',
            anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          },
          toParentMessage: message =>
            Message.GotGraduationYearListboxMessage({ message }),
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
                id: `${model.id}-school`,
                label: 'School',
                field: model.school,
                onInput: value => Message.UpdatedSchool({ value }),
                placeholder: 'e.g. MIT',
              },
              h,
            ),
            Field.input(
              {
                id: `${model.id}-degree`,
                label: 'Degree',
                field: model.degree,
                onInput: value => Message.UpdatedDegree({ value }),
                placeholder: "e.g. Bachelor's, Master's",
              },
              h,
            ),
          ],
        ),
        Field.input(
          {
            id: `${model.id}-field`,
            label: 'Field of Study',
            field: model.fieldOfStudy,
            onInput: value => Message.UpdatedFieldOfStudy({ value }),
            placeholder: 'e.g. Computer Science',
          },
          h,
        ),
        Field.checkbox(
          {
            id: `${model.id}-enrolled`,
            label: 'I’m currently enrolled',
            isChecked: model.isCurrentlyEnrolled,
            onToggle: isChecked =>
              Message.ToggledCurrentlyEnrolled({ isChecked }),
          },
          h,
        ),
        ...(showGraduationYear ? [graduationYearField] : []),
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
                    ['Remove education'],
                  ),
              },
              h,
            ),
          ],
        ),
      ],
    )
  },
)
