import {
  Array,
  Duration,
  Effect,
  Equal,
  Layer,
  Match,
  Number,
  Option,
  Schema,
} from 'effect'
import { Block, Command } from 'foldkit'
import {
  type CalendarDate,
  CalendarDate as CalendarDateSchema,
} from 'foldkit/calendar'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  Valid,
  Validating,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { type Html, type HtmlBuilder, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { DatePicker, Listbox } from '@foldkit/ui'

import * as DatePickerView from '../domain/datePicker'
import * as FieldView from '../domain/field'
import * as Icon from '../domain/icon'
import * as PronounOption from '../domain/pronounOption'
import { revealFieldErrors } from '../domain/validation'

const PronounsListbox = Listbox.makeBlock()

const Model = Schema.Struct({
  firstName: Field(Schema.String),
  lastName: Field(Schema.String),
  email: Field(Schema.String),
  emailValidationId: Schema.Number,
  phone: Field(Schema.String),
  pronouns: PronounsListbox,
  maybeSelectedPronoun: Schema.Option(Schema.String),
  customPronouns: Schema.String,
  portfolioUrl: Field(Schema.String),
  availableDate: DatePicker.DatePicker,
  maybeAvailableDate: Schema.Option(CalendarDateSchema),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedFirstName: { value: Schema.String },
  UpdatedLastName: { value: Schema.String },
  UpdatedEmail: { value: Schema.String },
  CompletedValidateEmailAsync: {
    validationId: Schema.Number,
    field: Field(Schema.String),
  },
  UpdatedPhone: { value: Schema.String },
  RequestedRevealErrors: {},
  UpdatedCustomPronouns: { value: Schema.String },
  UpdatedPortfolioUrl: { value: Schema.String },
})
type Message = typeof Message.Type

export const ValidateEmailAsync = Command.define('ValidateEmailAsync', {
  args: { emailInput: Schema.String, validationId: Schema.Number },
  messages: [Message.CompletedValidateEmailAsync],
})

type PersonalInfoArgs = Readonly<{ today: CalendarDate }>

export class PersonalInfo extends Block<PersonalInfo, PersonalInfoArgs>()(
  'PersonalInfo',
  { Model, Message, Command: [ValidateEmailAsync] },
) {}

// VALIDATION

const firstNameRules = makeRules({
  required: 'First name is required',
  rules: [Rule.minLength(2, 'First name must be at least 2 characters')],
})

const lastNameRules = makeRules({
  required: 'Last name is required',
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/

const phoneRules = makeRules({
  rules: [Rule.pattern(PHONE_PATTERN, 'Please enter a valid phone number')],
})

const portfolioUrlRules = makeRules({
  rules: [
    Rule.url({
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

const validatedFields = (model: Model): ReadonlyArray<Field<string>> => [
  model.firstName,
  model.lastName,
  model.email,
  model.phone,
  model.portfolioUrl,
]

export const personalInfoHasErrors = (model: Model): boolean =>
  anyInvalid(validatedFields(model))

export const isPersonalInfoComplete = (model: Model): boolean =>
  allValid([
    [model.firstName, firstNameRules],
    [model.lastName, lastNameRules],
    [model.email, emailRules],
    [model.phone, phoneRules],
    [model.portfolioUrl, portfolioUrlRules],
  ])

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

const validateEmailAsync = ({
  emailInput,
  validationId,
}: Readonly<{ emailInput: string; validationId: number }>) =>
  Effect.gen(function* () {
    if (yield* isEmailTaken(emailInput)) {
      return Message.CompletedValidateEmailAsync({
        validationId,
        field: Invalid({
          value: emailInput,
          errors: ['This email is already in use'],
        }),
      })
    }
    return Message.CompletedValidateEmailAsync({
      validationId,
      field: Valid({ value: emailInput }),
    })
  })

// VIEW

type PersonalInfoViewBuilder = HtmlBuilder<Message>

const availableDatePickerView = (
  datePicker: DatePicker.DatePicker,
  maybeSelectedDate: Option.Option<CalendarDate>,
  h: PersonalInfoViewBuilder,
): Html =>
  h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Available Start Date (optional)'],
      ),
      datePicker.view({
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        maybeSelectedDate,
        triggerContent: maybeDate =>
          DatePickerView.triggerContent(maybeDate, 'Pick a date'),
        triggerClassName: DatePickerView.triggerClassName,
        panelClassName: DatePickerView.panelClassName,
        backdropClassName: DatePickerView.backdropClassName,
        toCalendarView: DatePickerView.calendarView,
      }),
    ],
  )

const view = (model: Model, h: PersonalInfoViewBuilder): Html => {
  const {
    firstName,
    lastName,
    email,
    phone,
    maybeSelectedPronoun,
    customPronouns,
    portfolioUrl,
  } = model

  const isOtherSelected = Option.exists(
    maybeSelectedPronoun,
    Equal.equals('Other'),
  )

  const selectedPronounLabel = Option.getOrElse(
    maybeSelectedPronoun,
    () => 'Select pronouns',
  )

  return h.div(
    [h.Class('space-y-4')],
    [
      h.div(
        [h.Class('grid grid-cols-2 gap-4')],
        [
          FieldView.input(
            {
              id: 'first-name',
              label: 'First Name',
              field: firstName,
              onInput: value => Message.UpdatedFirstName({ value }),
              placeholder: 'Jane',
            },
            h,
          ),
          FieldView.input(
            {
              id: 'last-name',
              label: 'Last Name',
              field: lastName,
              onInput: value => Message.UpdatedLastName({ value }),
              placeholder: 'Doe',
            },
            h,
          ),
        ],
      ),
      FieldView.input(
        {
          id: 'email',
          label: 'Email',
          field: email,
          onInput: value => Message.UpdatedEmail({ value }),
          type: 'email',
          placeholder: 'jane@example.com',
        },
        h,
      ),
      FieldView.input(
        {
          id: 'phone',
          label: 'Phone (optional)',
          field: phone,
          onInput: value => Message.UpdatedPhone({ value }),
          type: 'tel',
          placeholder: '+1 (555) 123-4567',
        },
        h,
      ),
      h.div(
        [h.Class('space-y-1')],
        [
          h.label(
            [h.Class('block text-sm font-medium text-gray-700')],
            ['Pronouns (optional)'],
          ),
          model.pronouns.view({
            anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
            items: PronounOption.all,
            maybeSelectedValue: maybeSelectedPronoun,
            itemToConfig: (pronoun, { isSelected }) => ({
              className:
                'px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 data-[active]:bg-indigo-50',
              content: h.div(
                [h.Class('flex items-center gap-2')],
                [
                  h.span(
                    [
                      h.Class(
                        `w-4 text-indigo-600 ${isSelected ? 'visible' : 'invisible'}`,
                      ),
                    ],
                    ['✓'],
                  ),
                  h.span([], [pronoun]),
                ],
              ),
            }),
            buttonContent: h.div(
              [h.Class('flex w-full items-center justify-between gap-2')],
              [
                h.span(
                  [
                    h.Class(
                      Option.match(maybeSelectedPronoun, {
                        onNone: () => 'text-gray-400',
                        onSome: () => 'text-gray-900',
                      }),
                    ),
                  ],
                  [selectedPronounLabel],
                ),
                h.span(
                  [h.Class('text-gray-400')],
                  [Icon.chevronDown('w-4 h-4')],
                ),
              ],
            ),
            buttonAttributes: childAttributes([
              h.Class(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
              ),
            ]),
            itemsAttributes: childAttributes([
              h.Class(
                'w-(--button-width) rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden',
              ),
            ]),
            backdropAttributes: childAttributes([h.Class('fixed inset-0')]),
          }),
        ],
      ),
      ...(isOtherSelected
        ? [
            FieldView.input(
              {
                id: 'custom-pronouns',
                label: 'Custom Pronouns',
                field: Valid({ value: customPronouns }),
                onInput: value => Message.UpdatedCustomPronouns({ value }),
                placeholder: 'Enter your pronouns',
              },
              h,
            ),
          ]
        : []),
      FieldView.input(
        {
          id: 'portfolio-url',
          label: 'Portfolio URL (optional)',
          field: portfolioUrl,
          onInput: value => Message.UpdatedPortfolioUrl({ value }),
          type: 'url',
        },
        h,
      ),
      availableDatePickerView(model.availableDate, model.maybeAvailableDate, h),
    ],
  )
}

// LIVE

export const PersonalInfoLive = PersonalInfo.make(
  Effect.fn(function* (_id, { today }) {
    const pronouns = yield* new PronounsListbox('pronouns', { id: 'pronouns' })
    const availableDate = yield* new DatePicker.DatePicker('availableDate', {
      id: 'available-date',
      today,
      minDate: today,
    })

    return {
      model: {
        firstName: NotValidated({ value: '' }),
        lastName: NotValidated({ value: '' }),
        email: NotValidated({ value: '' }),
        emailValidationId: 0,
        phone: NotValidated({ value: '' }),
        pronouns,
        maybeSelectedPronoun: Option.none(),
        customPronouns: '',
        portfolioUrl: NotValidated({ value: '' }),
        availableDate,
        maybeAvailableDate: Option.none(),
      },

      update: {
        UpdatedFirstName: (model, { value }) => ({
          model: modifyFields(model, {
            firstName: () => validateFirstName(value),
          }),
        }),

        UpdatedLastName: (model, { value }) => ({
          model: modifyFields(model, {
            lastName: () => validateLastName(value),
          }),
        }),

        UpdatedEmail: (model, { value }) => {
          const validationId = Number.increment(model.emailValidationId)
          return Match.value(validateEmail(value)).pipe(
            Match.tag('Valid', () => ({
              model: modifyFields(model, {
                email: () => Validating({ value }),
                emailValidationId: () => validationId,
              }),
              commands: [
                ValidateEmailAsync({ emailInput: value, validationId }),
              ],
            })),
            Match.orElse(syncResult => ({
              model: modifyFields(model, {
                email: () => syncResult,
                emailValidationId: () => validationId,
              }),
            })),
          )
        },

        CompletedValidateEmailAsync: (model, { validationId, field }) => {
          if (validationId === model.emailValidationId) {
            return { model: modifyFields(model, { email: () => field }) }
          } else {
            return { model }
          }
        },

        UpdatedPhone: (model, { value }) => ({
          model: modifyFields(model, { phone: () => validatePhone(value) }),
        }),

        RequestedRevealErrors: model => ({
          model: modifyFields(model, {
            firstName: revealFieldErrors(firstNameRules),
            lastName: revealFieldErrors(lastNameRules),
            email: revealFieldErrors(emailRules),
            phone: revealFieldErrors(phoneRules),
            portfolioUrl: revealFieldErrors(portfolioUrlRules),
          }),
        }),

        UpdatedCustomPronouns: (model, { value }) => ({
          model: modifyFields(model, { customPronouns: () => value }),
        }),

        UpdatedPortfolioUrl: (model, { value }) => ({
          model: modifyFields(model, {
            portfolioUrl: () => validatePortfolioUrl(value),
          }),
        }),

        ...pronouns.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeSelectedPronoun: () => Option.some(value),
            }),
          }),
        }),

        ...availableDate.on({
          SelectedDate: (model, { date }) => ({
            model: modifyFields(model, {
              maybeAvailableDate: () => Option.some(date),
            }),
          }),
          ClearedDate: model => ({
            model: modifyFields(model, {
              maybeAvailableDate: () => Option.none(),
            }),
          }),
          ChangedViewMonth: model => ({ model }),
        }),
      },

      commands: {
        ValidateEmailAsync: validateEmailAsync,
      },

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(PronounsListbox.Live, DatePicker.DatePickerLive),
  ),
)
