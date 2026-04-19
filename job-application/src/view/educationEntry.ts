import clsx from 'clsx'
import { Array } from 'effect'
import { Ui } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { type Html } from 'foldkit/html'

import { Class, OnClick, Type, button, div, keyed, label, span } from '../html'
import { GotEducationMessage } from '../message'
import { Education } from '../step'
import { inputField } from './field'
import { chevronDown } from './icon'

const GRADUATION_YEAR_WINDOW_SIZE = 30
const GRADUATION_YEAR_FORWARD_OFFSET = 6

const graduationYears = (today: CalendarDate): ReadonlyArray<string> =>
  Array.makeBy(GRADUATION_YEAR_WINDOW_SIZE, index =>
    String(today.year + GRADUATION_YEAR_FORWARD_OFFSET - index),
  )

export const educationEntryView = (
  model: Education.Entry.Model,
  today: CalendarDate,
): Html => {
  const toEntryMessage = (message: Education.Entry.Message) =>
    GotEducationMessage({
      message: Education.GotEntryMessage({ entryId: model.id, message }),
    })

  const showGraduationYear = !model.isCurrentlyEnrolled.isChecked

  const graduationYearField = keyed('div')(
    `${model.id}-graduation-year`,
    [Class('space-y-1')],
    [
      label(
        [Class('block text-sm font-medium text-gray-700')],
        ['Graduation Year'],
      ),
      Ui.Listbox.view({
        model: model.graduationYearListbox,
        toParentMessage: message =>
          toEntryMessage(
            Education.Entry.GotGraduationYearListboxMessage({ message }),
          ),
        onSelectedItem: value =>
          toEntryMessage(Education.Entry.UpdatedGraduationYear({ value })),
        items: graduationYears(today),
        buttonContent: div(
          [Class('flex w-full items-center justify-between gap-2')],
          [
            model.graduationYear
              ? span([], [model.graduationYear])
              : span([Class('text-gray-400')], ['Select year']),
            span([Class('text-gray-400 shrink-0')], [chevronDown()]),
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
          content: div(
            [Class('flex items-center gap-2 w-full')],
            [
              isSelected ? span([], ['\u2713']) : span([Class('w-4')], []),
              span([], [year]),
            ],
          ),
        }),
        backdropClassName: 'fixed inset-0',
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
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
            id: `${model.id}-school`,
            label: 'School',
            field: model.school,
            onInput: value =>
              toEntryMessage(Education.Entry.UpdatedSchool({ value })),
            placeholder: 'e.g. MIT',
          }),
          inputField({
            id: `${model.id}-degree`,
            label: 'Degree',
            field: model.degree,
            onInput: value =>
              toEntryMessage(Education.Entry.UpdatedDegree({ value })),
            placeholder: "e.g. Bachelor's, Master's",
          }),
        ],
      ),
      inputField({
        id: `${model.id}-field`,
        label: 'Field of Study',
        field: model.fieldOfStudy,
        onInput: value =>
          toEntryMessage(Education.Entry.UpdatedFieldOfStudy({ value })),
        placeholder: 'e.g. Computer Science',
      }),
      Ui.Checkbox.view({
        model: model.isCurrentlyEnrolled,
        toParentMessage: message =>
          toEntryMessage(
            Education.Entry.GotIsCurrentlyEnrolledMessage({ message }),
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
                      model.isCurrentlyEnrolled.isChecked
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-300'
                    }`,
                  ),
                ],
                [
                  ...(model.isCurrentlyEnrolled.isChecked
                    ? [span([Class('text-white text-xs')], ['\u2713'])]
                    : []),
                ],
              ),
              label(
                [
                  ...attributes.label,
                  Class('text-sm text-gray-700 select-none cursor-pointer'),
                ],
                ['I\u2019m currently enrolled'],
              ),
            ],
          ),
      }),
      ...(showGraduationYear ? [graduationYearField] : []),
      div(
        [Class('flex justify-end')],
        [
          button(
            [
              Type('button'),
              OnClick(
                GotEducationMessage({
                  message: Education.RemovedEntry({ entryId: model.id }),
                }),
              ),
              Class(
                'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
              ),
            ],
            ['Remove education'],
          ),
        ],
      ),
    ],
  )
}
