import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Schema as S,
} from 'effect'
import { Command, Ui } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import {
  Field,
  Invalid,
  NotValidated,
  Valid,
  Validating,
  allValid,
  anyInvalid,
  email,
  makeRules,
  minLength,
  pattern,
  url,
  validate,
} from 'foldkit/fieldValidation'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  firstName: Field,
  lastName: Field,
  email: Field,
  emailValidationId: S.Number,
  phone: Field,
  pronouns: Ui.Listbox.Model,
  customPronouns: S.String,
  portfolioUrl: Field,
  availableDate: Ui.DatePicker.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedFirstName = m('UpdatedFirstName', { value: S.String })
export const UpdatedLastName = m('UpdatedLastName', { value: S.String })
export const UpdatedEmail = m('UpdatedEmail', { value: S.String })
export const ValidatedEmail = m('ValidatedEmail', {
  validationId: S.Number,
  field: Field,
})
export const UpdatedPhone = m('UpdatedPhone', { value: S.String })
export const GotPronounsMessage = m('GotPronounsMessage', {
  message: Ui.Listbox.Message,
})
export const UpdatedCustomPronouns = m('UpdatedCustomPronouns', {
  value: S.String,
})
export const UpdatedPortfolioUrl = m('UpdatedPortfolioUrl', {
  value: S.String,
})
export const GotAvailableDateMessage = m('GotAvailableDateMessage', {
  message: Ui.DatePicker.Message,
})

export const Message = S.Union([
  UpdatedFirstName,
  UpdatedLastName,
  UpdatedEmail,
  ValidatedEmail,
  UpdatedPhone,
  GotPronounsMessage,
  UpdatedCustomPronouns,
  UpdatedPortfolioUrl,
  GotAvailableDateMessage,
])
export type Message = typeof Message.Type

// INIT

export const init = (today: CalendarDate): Model => ({
  firstName: NotValidated({ value: '' }),
  lastName: NotValidated({ value: '' }),
  email: NotValidated({ value: '' }),
  emailValidationId: 0,
  phone: NotValidated({ value: '' }),
  pronouns: Ui.Listbox.init({ id: 'pronouns' }),
  customPronouns: '',
  portfolioUrl: NotValidated({ value: '' }),
  availableDate: Ui.DatePicker.init({
    id: 'available-date',
    today,
    minDate: today,
  }),
})

// FIELD VALIDATION

const firstNameRules = makeRules({
  required: 'First name is required',
  rules: [minLength(2, 'First name must be at least 2 characters')],
})

const lastNameRules = makeRules({
  required: 'Last name is required',
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [email('Please enter a valid email address')],
})

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/

const phoneRules = makeRules({
  rules: [pattern(PHONE_PATTERN, 'Please enter a valid phone number')],
})

const portfolioUrlRules = makeRules({
  rules: [
    url({
      message: 'Please enter a valid URL',
      requireProtocol: false,
    }),
  ],
})

const validateFirstName = validate(firstNameRules)
const validateLastName = validate(lastNameRules)
const validateEmail = validate(emailRules)
const validatePhone = validate(phoneRules)
const validatePortfolioUrl = validate(portfolioUrlRules)

// COMMAND

const FAKE_API_DELAY_MS = 600

const TAKEN_EMAILS = [
  'admin@foldkit.dev',
  'test@example.com',
  'demo@foldkit.dev',
]

const isEmailTaken = (emailInput: string): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(FAKE_API_DELAY_MS))
    return Array.contains(TAKEN_EMAILS, emailInput.toLowerCase())
  })

export const ValidateEmailAsync = Command.define(
  'ValidateEmailAsync',
  ValidatedEmail,
)

const validateEmailAsync = (emailInput: string, validationId: number) =>
  ValidateEmailAsync(
    Effect.gen(function* () {
      if (yield* isEmailTaken(emailInput)) {
        return ValidatedEmail({
          validationId,
          field: Invalid({
            value: emailInput,
            errors: ['This email is already in use'],
          }),
        })
      }
      return ValidatedEmail({
        validationId,
        field: Valid({ value: emailInput }),
      })
    }),
  )

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedFirstName: ({ value }) => [
        evo(model, { firstName: () => validateFirstName(value) }),
        [],
      ],

      UpdatedLastName: ({ value }) => [
        evo(model, { lastName: () => validateLastName(value) }),
        [],
      ],

      UpdatedEmail: ({ value }) => {
        const validationId = Number.increment(model.emailValidationId)
        return M.value(validateEmail(value)).pipe(
          M.withReturnType<UpdateReturn>(),
          M.tag('Valid', () => [
            evo(model, {
              email: () => Validating({ value }),
              emailValidationId: () => validationId,
            }),
            [validateEmailAsync(value, validationId)],
          ]),
          M.orElse(syncResult => [
            evo(model, {
              email: () => syncResult,
              emailValidationId: () => validationId,
            }),
            [],
          ]),
        )
      },

      ValidatedEmail: ({ validationId, field }) => {
        if (validationId === model.emailValidationId) {
          return [evo(model, { email: () => field }), []]
        } else {
          return [model, []]
        }
      },

      UpdatedPhone: ({ value }) => [
        evo(model, { phone: () => validatePhone(value) }),
        [],
      ],

      GotPronounsMessage: ({ message: listboxMessage }) => {
        const [nextPronouns, listboxCommands] = Ui.Listbox.update(
          model.pronouns,
          listboxMessage,
        )
        return [
          evo(model, { pronouns: () => nextPronouns }),
          listboxCommands.map(
            Command.mapEffect(
              Effect.map(innerMessage =>
                GotPronounsMessage({ message: innerMessage }),
              ),
            ),
          ),
        ]
      },

      UpdatedCustomPronouns: ({ value }) => [
        evo(model, { customPronouns: () => value }),
        [],
      ],

      UpdatedPortfolioUrl: ({ value }) => [
        evo(model, {
          portfolioUrl: () => validatePortfolioUrl(value),
        }),
        [],
      ],

      GotAvailableDateMessage: ({ message: dateMessage }) => {
        const [nextDate, commands] = Ui.DatePicker.update(
          model.availableDate,
          dateMessage,
        )
        return [
          evo(model, { availableDate: () => nextDate }),
          commands.map(
            Command.mapEffect(
              Effect.map(innerMessage =>
                GotAvailableDateMessage({ message: innerMessage }),
              ),
            ),
          ),
        ]
      },
    }),
  )

// VALIDATION SUMMARY

const validatedFields = (model: Model): ReadonlyArray<Field> => [
  model.firstName,
  model.lastName,
  model.email,
  model.phone,
  model.portfolioUrl,
]

export const hasErrors = (model: Model): boolean =>
  anyInvalid(validatedFields(model))

export const isComplete = (model: Model): boolean =>
  allValid([
    [model.firstName, firstNameRules],
    [model.lastName, lastNameRules],
    [model.email, emailRules],
    [model.phone, phoneRules],
    [model.portfolioUrl, portfolioUrlRules],
  ])
