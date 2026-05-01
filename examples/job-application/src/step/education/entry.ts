import { Effect, Match as M, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import {
  Field,
  NotValidated,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// FIELD VALIDATION

export const schoolRules = makeRules({
  required: 'School is required',
})

export const degreeRules = makeRules({
  required: 'Degree is required',
})

export const fieldOfStudyRules = makeRules({
  required: 'Field of study is required',
})

const validateSchool = validate(schoolRules)
const validateDegree = validate(degreeRules)
const validateFieldOfStudy = validate(fieldOfStudyRules)

// MODEL

export const Model = S.Struct({
  id: S.String,
  school: Field,
  degree: Field,
  fieldOfStudy: Field,
  graduationYear: S.String,
  graduationYearListbox: Ui.Listbox.Model,
  isCurrentlyEnrolled: Ui.Checkbox.Model,
  gpa: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedSchool = m('UpdatedSchool', { value: S.String })
export const UpdatedDegree = m('UpdatedDegree', { value: S.String })
export const UpdatedFieldOfStudy = m('UpdatedFieldOfStudy', {
  value: S.String,
})
export const UpdatedGraduationYear = m('UpdatedGraduationYear', {
  value: S.String,
})
export const GotGraduationYearListboxMessage = m(
  'GotGraduationYearListboxMessage',
  { message: Ui.Listbox.Message },
)
export const GotIsCurrentlyEnrolledMessage = m(
  'GotIsCurrentlyEnrolledMessage',
  { message: Ui.Checkbox.Message },
)
export const UpdatedGpa = m('UpdatedGpa', { value: S.String })

export const Message = S.Union([
  UpdatedSchool,
  UpdatedDegree,
  UpdatedFieldOfStudy,
  UpdatedGraduationYear,
  GotGraduationYearListboxMessage,
  GotIsCurrentlyEnrolledMessage,
  UpdatedGpa,
])
export type Message = typeof Message.Type

// INIT

export const init = (entryId: string): Model => ({
  id: entryId,
  school: NotValidated({ value: '' }),
  degree: NotValidated({ value: '' }),
  fieldOfStudy: NotValidated({ value: '' }),
  graduationYear: '',
  graduationYearListbox: Ui.Listbox.init({
    id: `${entryId}-graduation-year`,
  }),
  isCurrentlyEnrolled: Ui.Checkbox.init({ id: `${entryId}-enrolled` }),
  gpa: '',
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const mapGraduationYearListboxCommands = (
  commands: ReadonlyArray<Command.Command<Ui.Listbox.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  commands.map(
    Command.mapEffect(
      Effect.map(message => GotGraduationYearListboxMessage({ message })),
    ),
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedSchool: ({ value }) => [
        evo(model, { school: () => validateSchool(value) }),
        [],
      ],

      UpdatedDegree: ({ value }) => [
        evo(model, { degree: () => validateDegree(value) }),
        [],
      ],

      UpdatedFieldOfStudy: ({ value }) => [
        evo(model, { fieldOfStudy: () => validateFieldOfStudy(value) }),
        [],
      ],

      UpdatedGraduationYear: ({ value }) => {
        const [nextListbox, commands] = Ui.Listbox.selectItem(
          model.graduationYearListbox,
          value,
        )
        return [
          evo(model, {
            graduationYear: () => value,
            graduationYearListbox: () => nextListbox,
          }),
          mapGraduationYearListboxCommands(commands),
        ]
      },

      GotGraduationYearListboxMessage: ({ message: listboxMessage }) => {
        const [nextListbox, commands] = Ui.Listbox.update(
          model.graduationYearListbox,
          listboxMessage,
        )
        return [
          evo(model, { graduationYearListbox: () => nextListbox }),
          mapGraduationYearListboxCommands(commands),
        ]
      },

      GotIsCurrentlyEnrolledMessage: ({ message: checkboxMessage }) => {
        const [nextCheckbox] = Ui.Checkbox.update(
          model.isCurrentlyEnrolled,
          checkboxMessage,
        )
        return [evo(model, { isCurrentlyEnrolled: () => nextCheckbox }), []]
      },

      UpdatedGpa: ({ value }) => [evo(model, { gpa: () => value }), []],
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.school, entry.degree, entry.fieldOfStudy])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.school, schoolRules],
    [entry.degree, degreeRules],
    [entry.fieldOfStudy, fieldOfStudyRules],
  ])
