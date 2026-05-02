import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
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

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

const revealFieldErrors =
  (rules: Rules) =>
  (field: Field): Field =>
    field._tag === 'NotValidated' ? validate(rules)(field.value) : field

// MODEL

export const Model = S.Struct({
  id: S.String,
  company: Field,
  title: Field,
  startDate: Ui.DatePicker.Model,
  endDate: Ui.DatePicker.Model,
  isCurrentlyEmployed: Ui.Checkbox.Model,
  description: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedCompany = m('UpdatedCompany', { value: S.String })
export const UpdatedTitle = m('UpdatedTitle', { value: S.String })
export const GotStartDateMessage = m('GotStartDateMessage', {
  message: Ui.DatePicker.Message,
})
export const SelectedStartDate = m('SelectedStartDate', {
  date: CalendarDate,
})
export const GotEndDateMessage = m('GotEndDateMessage', {
  message: Ui.DatePicker.Message,
})
export const SelectedEndDate = m('SelectedEndDate', {
  date: CalendarDate,
})
export const GotIsCurrentlyEmployedMessage = m(
  'GotIsCurrentlyEmployedMessage',
  { message: Ui.Checkbox.Message },
)
export const UpdatedDescription = m('UpdatedDescription', {
  value: S.String,
})

export const Message = S.Union(
  UpdatedCompany,
  UpdatedTitle,
  GotStartDateMessage,
  SelectedStartDate,
  GotEndDateMessage,
  SelectedEndDate,
  GotIsCurrentlyEmployedMessage,
  UpdatedDescription,
)
export type Message = typeof Message.Type

// INIT

export const init = (entryId: string, today: CalendarDate): Model => ({
  id: entryId,
  company: NotValidated({ value: '' }),
  title: NotValidated({ value: '' }),
  startDate: Ui.DatePicker.init({ id: `${entryId}-start`, today }),
  endDate: Ui.DatePicker.init({ id: `${entryId}-end`, today }),
  isCurrentlyEmployed: Ui.Checkbox.init({ id: `${entryId}-current` }),
  description: '',
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedCompany: ({ value }) => [
        evo(model, { company: () => validateCompany(value) }),
        [],
      ],

      UpdatedTitle: ({ value }) => [
        evo(model, { title: () => validateTitle(value) }),
        [],
      ],

      GotStartDateMessage: ({ message: dateMessage }) => {
        const [nextStartDate, commands] = Ui.DatePicker.update(
          model.startDate,
          dateMessage,
        )
        return [
          evo(model, { startDate: () => nextStartDate }),
          Array.map(
            commands,
            Command.mapEffect(
              Effect.map(message => GotStartDateMessage({ message })),
            ),
          ),
        ]
      },

      SelectedStartDate: ({ date }) => {
        const [nextStartDate, commands] = Ui.DatePicker.selectDate(
          model.startDate,
          date,
        )
        const nextEndDate = Ui.DatePicker.setMinDate(
          model.endDate,
          Option.some(date),
        )
        return [
          evo(model, {
            startDate: () => nextStartDate,
            endDate: () => nextEndDate,
          }),
          Array.map(
            commands,
            Command.mapEffect(
              Effect.map(message => GotStartDateMessage({ message })),
            ),
          ),
        ]
      },

      GotEndDateMessage: ({ message: dateMessage }) => {
        const [nextEndDate, commands] = Ui.DatePicker.update(
          model.endDate,
          dateMessage,
        )
        return [
          evo(model, { endDate: () => nextEndDate }),
          Array.map(
            commands,
            Command.mapEffect(
              Effect.map(message => GotEndDateMessage({ message })),
            ),
          ),
        ]
      },

      SelectedEndDate: ({ date }) => {
        const [nextEndDate, commands] = Ui.DatePicker.selectDate(
          model.endDate,
          date,
        )
        const nextStartDate = Ui.DatePicker.setMaxDate(
          model.startDate,
          Option.some(date),
        )
        return [
          evo(model, {
            endDate: () => nextEndDate,
            startDate: () => nextStartDate,
          }),
          Array.map(
            commands,
            Command.mapEffect(
              Effect.map(message => GotEndDateMessage({ message })),
            ),
          ),
        ]
      },

      GotIsCurrentlyEmployedMessage: ({ message: checkboxMessage }) => {
        const [nextCheckbox] = Ui.Checkbox.update(
          model.isCurrentlyEmployed,
          checkboxMessage,
        )
        return [evo(model, { isCurrentlyEmployed: () => nextCheckbox }), []]
      },

      UpdatedDescription: ({ value }) => [
        evo(model, { description: () => value }),
        [],
      ],
    }),
  )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.company, entry.title])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])

export const revealErrors = (entry: Model): Model =>
  evo(entry, {
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })
