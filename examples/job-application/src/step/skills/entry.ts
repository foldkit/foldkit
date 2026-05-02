import { Effect, Match as M, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import {
  Field,
  NotValidated,
  type Rules,
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

const revealFieldErrors =
  (rules: Rules) =>
  (field: Field): Field =>
    field._tag === 'NotValidated' ? validate(rules)(field.value) : field

// MODEL

export const Model = S.Struct({
  id: S.String,
  name: Field,
  proficiency: Ui.RadioGroup.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedName = m('UpdatedName', { value: S.String })
export const GotProficiencyMessage = m('GotProficiencyMessage', {
  message: Ui.RadioGroup.Message,
})

export const Message = S.Union(UpdatedName, GotProficiencyMessage)
export type Message = typeof Message.Type

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

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedName: ({ value }) => [
        evo(model, { name: () => validateName(value) }),
        [],
      ],

      GotProficiencyMessage: ({ message: radioMessage }) => {
        const [nextProficiency, radioCommands] = Ui.RadioGroup.update(
          model.proficiency,
          radioMessage,
        )
        return [
          evo(model, { proficiency: () => nextProficiency }),
          radioCommands.map(
            Command.mapEffect(
              Effect.map(innerMessage =>
                GotProficiencyMessage({ message: innerMessage }),
              ),
            ),
          ),
        ]
      },
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean => anyInvalid([entry.name])

export const isComplete = (entry: Model): boolean =>
  allValid([[entry.name, nameRules]])

export const revealErrors = (entry: Model): Model =>
  evo(entry, { name: revealFieldErrors(nameRules) })
