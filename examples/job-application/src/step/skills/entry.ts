import { Match as M, Option, Schema as S } from 'effect'
import { Command, Update } from 'foldkit'
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

import { RadioGroup } from '@foldkit/ui'

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

export const ProficiencyRadioGroup =
  RadioGroup.create<ProficiencyLevel.ProficiencyLevel>()

export const Model = S.Struct({
  id: S.String,
  name: Field(S.String),
  proficiency: ProficiencyLevel.ProficiencyLevel,
  proficiencyRadioGroup: RadioGroup.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedName = m('UpdatedName', { value: S.String })
export const GotProficiencyRadioGroupMessage = m(
  'GotProficiencyRadioGroupMessage',
  { message: RadioGroup.Message },
)
export const ClickedRemoveSelf = m('ClickedRemoveSelf')

export const Message = S.Union([
  UpdatedName,
  GotProficiencyRadioGroupMessage,
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
  proficiencyRadioGroup: RadioGroup.init({
    id: proficiencyRadioGroupId(entryId),
  }),
})

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

const foldProficiencyRadioGroupOutMessage = M.type<
  RadioGroup.OutMessage<ProficiencyLevel.ProficiencyLevel>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => [evo(model, { proficiency: () => value }), []],
  }),
)

const foldProficiencyRadioGroup = Update.foldChild({
  update: ProficiencyRadioGroup.update,
  read: (model: Model) => Option.some(model.proficiencyRadioGroup),
  write: (model, nextProficiencyRadioGroup) =>
    evo(model, { proficiencyRadioGroup: () => nextProficiencyRadioGroup }),
  toParentMessage: message => GotProficiencyRadioGroupMessage({ message }),
  foldOutMessage: foldProficiencyRadioGroupOutMessage,
  toParentOutMessage: () => Option.none(),
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedName: ({ value }) => [
        evo(model, { name: () => validateName(value) }),
        [],
        Option.none(),
      ],

      GotProficiencyRadioGroupMessage: ({ message }) =>
        foldProficiencyRadioGroup(model, message),

      ClickedRemoveSelf: () => [model, [], Option.some(Removed())],
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean => anyInvalid([entry.name])

export const isComplete = (entry: Model): boolean =>
  allValid([[entry.name, nameRules]])

export const revealErrors = (entry: Model): Model =>
  evo(entry, { name: revealFieldErrors(nameRules) })
