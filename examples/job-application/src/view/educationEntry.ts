import clsx from 'clsx'
import { Array } from 'effect'
import { Submodel, Ui } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { type Html, html } from 'foldkit/html'

import { Education } from '../step'
import { inputField } from './field'
import { chevronDown } from './icon'

const GRADUATION_YEAR_WINDOW_SIZE = 30
const GRADUATION_YEAR_FORWARD_OFFSET = 6

const GraduationYearListbox = Ui.Listbox.create<string>()

const graduationYears = (today: CalendarDate): ReadonlyArray<string> =>
  Array.makeBy(GRADUATION_YEAR_WINDOW_SIZE, index =>
    String(today.year + GRADUATION_YEAR_FORWARD_OFFSET - index),
  )

export type ViewInputs = Readonly<{
  today: CalendarDate
}>

export const educationEntryView = Submodel.defineView<
  Education.Entry.Model,
  Education.Entry.Message,
  ViewInputs
>((model, viewInputs): Html => {
  const h = html<Education.Entry.Message>()
  const { today } = viewInputs

  const showGraduationYear = !model.isCurrentlyEnrolled.isChecked

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
          buttonContent: h.div(
            [h.Class('flex w-full items-center justify-between gap-2')],
            [
              model.graduationYear
                ? h.span([], [model.graduationYear])
                : h.span([h.Class('text-gray-400')], ['Select year']),
              h.span([h.Class('text-gray-400 shrink-0')], [chevronDown()]),
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
                isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')], []),
                h.span([], [year]),
              ],
            ),
          }),
          backdropClassName: 'fixed inset-0',
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        },
        toParentMessage: message =>
          Education.Entry.GotGraduationYearListboxMessage({ message }),
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
          inputField<Education.Entry.Message>({
            id: `${model.id}-school`,
            label: 'School',
            field: model.school,
            onInput: value => Education.Entry.UpdatedSchool({ value }),
            placeholder: 'e.g. MIT',
          }),
          inputField<Education.Entry.Message>({
            id: `${model.id}-degree`,
            label: 'Degree',
            field: model.degree,
            onInput: value => Education.Entry.UpdatedDegree({ value }),
            placeholder: "e.g. Bachelor's, Master's",
          }),
        ],
      ),
      inputField<Education.Entry.Message>({
        id: `${model.id}-field`,
        label: 'Field of Study',
        field: model.fieldOfStudy,
        onInput: value => Education.Entry.UpdatedFieldOfStudy({ value }),
        placeholder: 'e.g. Computer Science',
      }),
      h.submodel({
        slotId: `${model.id}-currently-enrolled`,
        model: model.isCurrentlyEnrolled,
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
                        model.isCurrentlyEnrolled.isChecked
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-gray-300'
                      }`,
                    ),
                  ],
                  [
                    ...(model.isCurrentlyEnrolled.isChecked
                      ? [h.span([h.Class('text-white text-xs')], ['✓'])]
                      : []),
                  ],
                ),
                h.label(
                  [
                    ...attributes.label,
                    h.Class('text-sm text-gray-700 select-none cursor-pointer'),
                  ],
                  ['I’m currently enrolled'],
                ),
              ],
            ),
        },
        toParentMessage: message =>
          Education.Entry.GotIsCurrentlyEnrolledMessage({ message }),
      }),
      ...(showGraduationYear ? [graduationYearField] : []),
      h.div(
        [h.Class('flex justify-end')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(Education.Entry.ClickedRemoveSelf()),
              h.Class(
                'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
              ),
            ],
            ['Remove education'],
          ),
        ],
      ),
    ],
  )
})
