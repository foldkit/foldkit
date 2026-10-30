import clsx from 'clsx'
import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import {
  Field,
  NotValidated,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Listbox } from '@foldkit/ui'

import * as FieldView from '../../domain/field'
import * as Icon from '../../domain/icon'
import { revealFieldErrors } from '../../domain/validation'

const GraduationYearListbox = Listbox.makeBlock()

const Model = Schema.Struct({
  id: Schema.String,
  school: Field(Schema.String),
  degree: Field(Schema.String),
  fieldOfStudy: Field(Schema.String),
  maybeGraduationYear: Schema.Option(Schema.String),
  graduationYearListbox: GraduationYearListbox,
  isCurrentlyEnrolled: Schema.Boolean,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedSchool: { value: Schema.String },
  UpdatedDegree: { value: Schema.String },
  UpdatedFieldOfStudy: { value: Schema.String },
  ToggledCurrentlyEnrolled: { isChecked: Schema.Boolean },
  RequestedRevealErrors: {},
  ClickedRemoveSelf: {},
})

const OutMessage = defineMessageUnion({
  Removed: {},
})

type EducationEntryArgs = Readonly<{ today: CalendarDate }>

export class EducationEntry extends Block<EducationEntry, EducationEntryArgs>()(
  'EducationEntry',
  { Model, Message, OutMessage },
) {}

const schoolRules = makeRules({
  required: 'School is required',
})

const degreeRules = makeRules({
  required: 'Degree is required',
})

const fieldOfStudyRules = makeRules({
  required: 'Field of study is required',
})

const validateSchool = validate(schoolRules)
const validateDegree = validate(degreeRules)
const validateFieldOfStudy = validate(fieldOfStudyRules)

export const educationEntryHasErrors = (entry: Model): boolean =>
  anyInvalid([entry.school, entry.degree, entry.fieldOfStudy])

export const isEducationEntryComplete = (entry: Model): boolean =>
  allValid([
    [entry.school, schoolRules],
    [entry.degree, degreeRules],
    [entry.fieldOfStudy, fieldOfStudyRules],
  ])

const GRADUATION_YEAR_WINDOW_SIZE = 30
const GRADUATION_YEAR_FORWARD_OFFSET = 6

const graduationYears = (today: CalendarDate): ReadonlyArray<string> =>
  Array.makeBy(GRADUATION_YEAR_WINDOW_SIZE, index =>
    String(today.year + GRADUATION_YEAR_FORWARD_OFFSET - index),
  )

export const EducationEntryLive = EducationEntry.make(
  Effect.fn(function* (entryId, { today }) {
    const graduationYearListbox = yield* new GraduationYearListbox(
      'graduationYearListbox',
      { id: `${entryId}-graduation-year` },
    )

    return {
      model: {
        id: entryId,
        school: NotValidated({ value: '' }),
        degree: NotValidated({ value: '' }),
        fieldOfStudy: NotValidated({ value: '' }),
        maybeGraduationYear: Option.none(),
        graduationYearListbox,
        isCurrentlyEnrolled: false,
      },

      update: {
        UpdatedSchool: (model, { value }) => ({
          model: modifyFields(model, { school: () => validateSchool(value) }),
        }),

        UpdatedDegree: (model, { value }) => ({
          model: modifyFields(model, { degree: () => validateDegree(value) }),
        }),

        UpdatedFieldOfStudy: (model, { value }) => ({
          model: modifyFields(model, {
            fieldOfStudy: () => validateFieldOfStudy(value),
          }),
        }),

        ToggledCurrentlyEnrolled: (model, { isChecked }) => ({
          model: modifyFields(model, { isCurrentlyEnrolled: () => isChecked }),
        }),

        RequestedRevealErrors: model => ({
          model: modifyFields(model, {
            school: revealFieldErrors(schoolRules),
            degree: revealFieldErrors(degreeRules),
            fieldOfStudy: revealFieldErrors(fieldOfStudyRules),
          }),
        }),

        ClickedRemoveSelf: model => ({
          model,
          outMessage: OutMessage.Removed(),
        }),

        ...graduationYearListbox.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeGraduationYear: () => Option.some(value),
            }),
          }),
        }),
      },

      view: (model, h) => {
        const showGraduationYear = !model.isCurrentlyEnrolled

        const graduationYearField = h.keyed('div')(
          `${model.id}-graduation-year`,
          [h.Class('space-y-1')],
          [
            h.label(
              [h.Class('block text-sm font-medium text-gray-700')],
              ['Graduation Year'],
            ),
            model.graduationYearListbox.view({
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
                FieldView.input(
                  {
                    id: `${model.id}-school`,
                    label: 'School',
                    field: model.school,
                    onInput: value => Message.UpdatedSchool({ value }),
                    placeholder: 'e.g. MIT',
                  },
                  h,
                ),
                FieldView.input(
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
            FieldView.input(
              {
                id: `${model.id}-field`,
                label: 'Field of Study',
                field: model.fieldOfStudy,
                onInput: value => Message.UpdatedFieldOfStudy({ value }),
                placeholder: 'e.g. Computer Science',
              },
              h,
            ),
            FieldView.checkbox(
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
    }
  }),
).pipe(Layer.provide(GraduationYearListbox.Live))
