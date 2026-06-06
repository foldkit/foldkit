import { Match as M, Option, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'
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

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

// MODEL

export const Model = S.Struct({
  id: S.String,
  company: Field(S.String),
  title: Field(S.String),
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
export const GotEndDateMessage = m('GotEndDateMessage', {
  message: Ui.DatePicker.Message,
})
export const GotIsCurrentlyEmployedMessage = m(
  'GotIsCurrentlyEmployedMessage',
  { message: Ui.Checkbox.Message },
)
export const UpdatedDescription = m('UpdatedDescription', {
  value: S.String,
})
export const ClickedRemoveSelf = m('ClickedRemoveSelf')

export const Message = S.Union([
  UpdatedCompany,
  UpdatedTitle,
  GotStartDateMessage,
  GotEndDateMessage,
  GotIsCurrentlyEmployedMessage,
  UpdatedDescription,
  ClickedRemoveSelf,
])
export type Message = typeof Message.Type

// OUT MESSAGE

export const Removed = m('Removed')

export const OutMessage = S.Union([Removed])
export type OutMessage = typeof OutMessage.Type

export type Removed = typeof Removed.Type

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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedCompany: ({ value }) => [
        evo(model, { company: () => validateCompany(value) }),
        [],
        Option.none(),
      ],

      UpdatedTitle: ({ value }) => [
        evo(model, { title: () => validateTitle(value) }),
        [],
        Option.none(),
      ],

      GotStartDateMessage: ({ message: dateMessage }) => {
        const [nextStartDate, commands, maybeOutMessage] = Ui.DatePicker.update(
          model.startDate,
          dateMessage,
        )
        const mappedCommands = Command.mapMessages(commands, message =>
          GotStartDateMessage({ message }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { startDate: () => nextStartDate }),
            mappedCommands,
            Option.none(),
          ],
          onSome: M.type<Ui.DatePicker.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              ChangedViewMonth: () => [
                evo(model, { startDate: () => nextStartDate }),
                mappedCommands,
                Option.none(),
              ],
              SelectedDate: ({ date }) => [
                evo(model, {
                  startDate: () => nextStartDate,
                  endDate: Ui.DatePicker.reflectMinDate(Option.some(date)),
                }),
                mappedCommands,
                Option.none(),
              ],
            }),
          ),
        })
      },

      GotEndDateMessage: ({ message: dateMessage }) => {
        const [nextEndDate, commands, maybeOutMessage] = Ui.DatePicker.update(
          model.endDate,
          dateMessage,
        )
        const mappedCommands = Command.mapMessages(commands, message =>
          GotEndDateMessage({ message }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { endDate: () => nextEndDate }),
            mappedCommands,
            Option.none(),
          ],
          onSome: M.type<Ui.DatePicker.OutMessage>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              ChangedViewMonth: () => [
                evo(model, { endDate: () => nextEndDate }),
                mappedCommands,
                Option.none(),
              ],
              SelectedDate: ({ date }) => [
                evo(model, {
                  endDate: () => nextEndDate,
                  startDate: Ui.DatePicker.reflectMaxDate(Option.some(date)),
                }),
                mappedCommands,
                Option.none(),
              ],
            }),
          ),
        })
      },

      GotIsCurrentlyEmployedMessage: ({ message: checkboxMessage }) => {
        const [nextCheckbox] = Ui.Checkbox.update(
          model.isCurrentlyEmployed,
          checkboxMessage,
        )
        return [
          evo(model, { isCurrentlyEmployed: () => nextCheckbox }),
          [],
          Option.none(),
        ]
      },

      UpdatedDescription: ({ value }) => [
        evo(model, { description: () => value }),
        [],
        Option.none(),
      ],

      ClickedRemoveSelf: () => [model, [], Option.some(Removed())],
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
