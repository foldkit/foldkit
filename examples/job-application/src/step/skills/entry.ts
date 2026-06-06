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

export const nameRules = makeRules({
  required: 'Skill name is required',
})

const validateName = validate(nameRules)

// MODEL

const ProficiencyRadioGroup = Ui.RadioGroup.create<string>()

export const Model = S.Struct({
  id: S.String,
  name: Field(S.String),
  proficiency: Ui.RadioGroup.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedName = m('UpdatedName', { value: S.String })
export const GotProficiencyMessage = m('GotProficiencyMessage', {
  message: Ui.RadioGroup.Message,
})
export const ClickedRemoveSelf = m('ClickedRemoveSelf')

export const Message = S.Union([
  UpdatedName,
  GotProficiencyMessage,
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
  name: NotValidated({ value: '' }),
  proficiency: Ui.RadioGroup.init({
    id: `${entryId}-proficiency`,
    selectedValue: 'Intermediate',
    orientation: 'Horizontal',
  }),
})

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedName: ({ value }) => [
        evo(model, { name: () => validateName(value) }),
        [],
        Option.none(),
      ],

      GotProficiencyMessage: ({ message: radioMessage }) => {
        const [nextProficiency, radioCommands] = ProficiencyRadioGroup.update(
          model.proficiency,
          radioMessage,
        )
        return [
          evo(model, { proficiency: () => nextProficiency }),
          Command.mapMessages(radioCommands, innerMessage =>
            GotProficiencyMessage({ message: innerMessage }),
          ),
          Option.none(),
        ]
      },

      ClickedRemoveSelf: () => [model, [], Option.some(Removed())],
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean => anyInvalid([entry.name])

export const isComplete = (entry: Model): boolean =>
  allValid([[entry.name, nameRules]])
