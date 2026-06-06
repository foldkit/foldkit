import { Match as M, Option, Schema as S } from 'effect'
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
  school: Field(S.String),
  degree: Field(S.String),
  fieldOfStudy: Field(S.String),
  graduationYear: S.String,
  graduationYearListbox: Ui.Listbox.Model,
  isCurrentlyEnrolled: Ui.Checkbox.Model,
  gpa: S.String,
})
export type Model = typeof Model.Type

const GraduationYearListbox = Ui.Listbox.create<string>()

// MESSAGE

export const UpdatedSchool = m('UpdatedSchool', { value: S.String })
export const UpdatedDegree = m('UpdatedDegree', { value: S.String })
export const UpdatedFieldOfStudy = m('UpdatedFieldOfStudy', {
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
export const ClickedRemoveSelf = m('ClickedRemoveSelf')

export const Message = S.Union([
  UpdatedSchool,
  UpdatedDegree,
  UpdatedFieldOfStudy,
  GotGraduationYearListboxMessage,
  GotIsCurrentlyEnrolledMessage,
  UpdatedGpa,
  ClickedRemoveSelf,
])
export type Message = typeof Message.Type

// OUT MESSAGE

export const Removed = m('Removed')

export const OutMessage = S.Union([Removed])
export type OutMessage = typeof OutMessage.Type

export type Removed = typeof Removed.Type

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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

const mapGraduationYearListboxCommands = (
  commands: ReadonlyArray<Command.Command<Ui.Listbox.Message>>,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands, message =>
    GotGraduationYearListboxMessage({ message }),
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedSchool: ({ value }) => [
        evo(model, { school: () => validateSchool(value) }),
        [],
        Option.none(),
      ],

      UpdatedDegree: ({ value }) => [
        evo(model, { degree: () => validateDegree(value) }),
        [],
        Option.none(),
      ],

      UpdatedFieldOfStudy: ({ value }) => [
        evo(model, { fieldOfStudy: () => validateFieldOfStudy(value) }),
        [],
        Option.none(),
      ],

      GotGraduationYearListboxMessage: ({ message: listboxMessage }) => {
        const [nextListbox, commands, maybeOutMessage] =
          GraduationYearListbox.update(
            model.graduationYearListbox,
            listboxMessage,
          )
        const mappedCommands = mapGraduationYearListboxCommands(commands)

        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { graduationYearListbox: () => nextListbox }),
            mappedCommands,
            Option.none(),
          ],
          onSome: M.type<Ui.Listbox.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              Selected: ({ value }) => [
                evo(model, {
                  graduationYear: () => value,
                  graduationYearListbox: () => nextListbox,
                }),
                mappedCommands,
                Option.none(),
              ],
            }),
          ),
        })
      },

      GotIsCurrentlyEnrolledMessage: ({ message: checkboxMessage }) => {
        const [nextCheckbox] = Ui.Checkbox.update(
          model.isCurrentlyEnrolled,
          checkboxMessage,
        )
        return [
          evo(model, { isCurrentlyEnrolled: () => nextCheckbox }),
          [],
          Option.none(),
        ]
      },

      UpdatedGpa: ({ value }) => [
        evo(model, { gpa: () => value }),
        [],
        Option.none(),
      ],

      ClickedRemoveSelf: () => [model, [], Option.some(Removed())],
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
