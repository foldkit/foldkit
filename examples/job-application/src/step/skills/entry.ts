import { Match as M, Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
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

import { ProficiencyLevel } from '../../domain'
import { revealFieldErrors } from '../validation'

// FIELD VALIDATION

export const nameRules = makeRules({
  required: 'Skill name is required',
})

const validateName = validate(nameRules)

// MODEL

export const proficiencyRadioGroupId = (entryId: string): string =>
  `${entryId}-proficiency`

export const Model = S.Struct({
  id: S.String,
  name: Field(S.String),
  proficiency: ProficiencyLevel.ProficiencyLevel,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedName = m('UpdatedName', { value: S.String })
export const SelectedProficiency = m('SelectedProficiency', {
  value: ProficiencyLevel.ProficiencyLevel,
})
export const ClickedRemoveSelf = m('ClickedRemoveSelf')

export const Message = S.Union([
  UpdatedName,
  SelectedProficiency,
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
  proficiency: 'Intermediate',
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

      SelectedProficiency: ({ value }) => [
        evo(model, { proficiency: () => value }),
        [],
        Option.none(),
      ],

      ClickedRemoveSelf: () => [model, [], Option.some(Removed())],
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean => anyInvalid([entry.name])

export const isComplete = (entry: Model): boolean =>
  allValid([[entry.name, nameRules]])

export const revealErrors = (entry: Model): Model =>
  evo(entry, { name: revealFieldErrors(nameRules) })
