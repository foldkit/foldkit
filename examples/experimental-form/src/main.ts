import {
  Array,
  Duration,
  Effect,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import { Runtime, Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { emailField } from './fields'

// SUBMISSION

const SUBMISSION_DELAY_MS = 500
const TAKEN_EMAIL = 'taken@example.com'
const UNAVAILABLE_EMAIL = 'down@example.com'
const MIN_AGE = 13

export const RegistrationRejection = defineTaggedUnion({
  EmailTaken: {},
  RegistrationUnavailable: {},
})
type RegistrationRejection = typeof RegistrationRejection.Type

const registerPerson = (
  email: string,
): Effect.Effect<string, RegistrationRejection> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(SUBMISSION_DELAY_MS))

    if (email === TAKEN_EMAIL) {
      return yield* Effect.fail(RegistrationRejection.EmailTaken())
    }

    if (email === UNAVAILABLE_EMAIL) {
      return yield* Effect.fail(RegistrationRejection.RegistrationUnavailable())
    }

    return email
  })

const saveProfile = (
  profileId: string,
  profile: Readonly<{ email: string }>,
): Effect.Effect<void, string> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(SUBMISSION_DELAY_MS))

    if (profile.email === TAKEN_EMAIL) {
      return yield* Effect.fail(
        `Profile ${profileId} cannot use an email that is already registered`,
      )
    }
  })

// MODEL

const Topic = Schema.Literals(['Foldkit', 'Effect', 'Accessibility'])
type Topic = typeof Topic.Type

const toTopicInput = (value: string): Topic | null =>
  Option.getOrNull(Schema.decodeUnknownOption(Topic)(value))

const AgeInput = Schema.Trim.check(
  Schema.isNonEmpty({ message: 'Enter your age' }),
).pipe(
  Schema.decodeTo(
    Schema.Finite.annotate({ message: 'Enter a number' }),
    SchemaTransformation.numberFromString,
  ),
)

export const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    email: emailField,
    fullName: Form.field({
      schema: Schema.String,
      initial: '',
      rules: makeRules({
        required: 'Enter your name',
      }),
    }),
    age: Form.field({
      schema: AgeInput,
      initial: '',
      rules: makeRules<number>({
        rules: [[age => age >= MIN_AGE, `You must be at least ${MIN_AGE}`]],
      }),
    }),
    mainTopic: Form.field({
      schema: Form.RequiredFromNullOr(Topic, 'Choose a main topic'),
      initial: null,
    }),
  },
  submit: {
    data: Schema.String,
    error: RegistrationRejection,
    execute: ({ email }) => registerPerson(email),
    toFieldErrors: RegistrationRejection.match({
      EmailTaken: () => ({ email: 'This email is already registered' }),
      RegistrationUnavailable: () => ({}),
    }),
  },
})

export const profileForm = Form.define({
  name: 'Profile',
  fields: {
    email: emailField,
    topics: Form.field({ schema: Schema.Array(Topic), initial: [] }),
    isSubscribed: Form.field({ schema: Schema.Boolean, initial: false }),
    isDigestEnabled: Form.field({ schema: Schema.Boolean, initial: false }),
    displayName: Form.field({
      schema: Schema.String,
      initial: '',
      rules: makeRules({
        required: 'Enter a display name',
      }),
    }),
  },
  submit: {
    error: Schema.String,
    context: Schema.Struct({ profileId: Schema.String }),
    execute: (profile, { profileId }) => saveProfile(profileId, profile),
  },
})

export const Model = Schema.Struct({
  registration: registrationForm.Model,
  registeredEmails: Schema.Array(Schema.String),
  profileId: Schema.String,
  profile: profileForm.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotRegistrationMessage: { message: registrationForm.Message },
  GotProfileMessage: { message: profileForm.Message },
  SubmittedRegistrationForm: {},
  SubmittedProfileForm: {},
  ClickedProfileTopic: { topic: Topic },
  ClickedEmailUpdates: {},
  ClickedWeeklyDigest: {},
  ClickedResetRegistration: {},
  ClickedResetProfile: {},
})
export type Message = typeof Message.Type

const toRegistrationMessage = (
  message: typeof registrationForm.Message.Type,
): Message => Message.GotRegistrationMessage({ message })

const toProfileMessage = (message: typeof profileForm.Message.Type): Message =>
  Message.GotProfileMessage({ message })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: Model.make({
    registration: registrationForm.init(),
    registeredEmails: [],
    profileId: 'profile-1',
    profile: profileForm.init({
      email: 'reader@example.com',
      displayName: 'Reader',
    }),
  }),
})

// UPDATE

const foldRegistrationOutMessage = registrationForm.OutMessage.match<
  Update.Step<Model, Message>
>({
  SucceededSubmit:
    ({ data }) =>
    stepModel => ({
      model: modifyFields(stepModel, {
        registeredEmails: Array.append(data),
      }),
    }),
  FailedSubmit: () => stepModel => ({ model: stepModel }),
})

const foldProfileOutMessage = profileForm.OutMessage.match<
  Update.Step<Model, Message>
>({
  SucceededSubmit: () => stepModel => ({ model: stepModel }),
  FailedSubmit: () => stepModel => ({ model: stepModel }),
})

const registration = registrationForm.lift<Model, Message>({
  parentField: 'registration',
  toParentMessage: toRegistrationMessage,
  foldOutMessage: foldRegistrationOutMessage,
})

const profile = profileForm.lift<Model, Message>({
  parentField: 'profile',
  toParentMessage: toProfileMessage,
  foldOutMessage: foldProfileOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotRegistrationMessage: ({ message }) => registration.fold(model, message),
    GotProfileMessage: ({ message }) => profile.fold(model, message),
    SubmittedRegistrationForm: () => registration.submit()(model),
    ClickedProfileTopic: ({ topic }) => {
      const topics = profileForm.fieldView(model.profile, 'topics').input
      const nextTopics = topics.includes(topic)
        ? Array.filter(topics, selectedTopic => selectedTopic !== topic)
        : Array.append(topics, topic)

      return profile.fold(model, profileForm.changed('topics', nextTopics))
    },
    ClickedEmailUpdates: () => {
      const isSubscribed = profileForm.fieldView(
        model.profile,
        'isSubscribed',
      ).input

      return profile.fold(
        model,
        isSubscribed
          ? profileForm.changedFields({
              isSubscribed: false,
              isDigestEnabled: false,
            })
          : profileForm.changedFields({ isSubscribed: true }),
      )
    },
    ClickedWeeklyDigest: () => {
      const isDigestEnabled = profileForm.fieldView(
        model.profile,
        'isDigestEnabled',
      ).input

      return profile.fold(
        model,
        isDigestEnabled
          ? profileForm.changedFields({ isDigestEnabled: false })
          : profileForm.changedFields({
              isDigestEnabled: true,
              isSubscribed: true,
            }),
      )
    },
    SubmittedProfileForm: () =>
      profile.submit({ profileId: model.profileId })(model),
    ClickedResetRegistration: () => registration.reset(model),
    ClickedResetProfile: () => profile.reset(model),
  })

// VIEW

type TextFieldArgs = Readonly<{
  id: string
  label: string
  fieldView: Readonly<{
    input: string
    errors: ReadonlyArray<string>
    meta: Readonly<{ isEdited: boolean }>
  }>
  onInput: (input: string) => Message
  onBlur: Message
}>

const textInputView = (
  h: HtmlBuilder<Message>,
  { id, label, fieldView, onInput, onBlur }: TextFieldArgs,
): Html => {
  const errorsId = `${id}-errors`
  const isInvalid = Array.isReadonlyArrayNonEmpty(fieldView.errors)

  return h.div(
    [h.Class('space-y-1')],
    [
      h.label([h.For(id), h.Class('block font-medium')], [label]),
      h.input([
        h.Id(id),
        h.Type('text'),
        h.Value(fieldView.input),
        h.AriaInvalid(isInvalid),
        h.AriaDescribedBy(errorsId),
        h.Class(
          isInvalid
            ? 'w-full rounded border border-red-600 px-3 py-2'
            : 'w-full rounded border border-slate-300 px-3 py-2',
        ),
        h.OnInput(onInput),
        h.OnBlur(onBlur),
      ]),
      h.div(
        [h.Id(errorsId)],
        Array.map(fieldView.errors, error =>
          h.p([h.Class('text-sm text-red-700')], [error]),
        ),
      ),
      h.p(
        [h.Class('text-xs text-slate-500')],
        [fieldView.meta.isEdited ? 'Edited' : 'Not edited yet'],
      ),
    ],
  )
}

const statusView = (h: HtmlBuilder<Message>, text: string): Html =>
  h.p([h.Role('status')], [text])

const successStatusView = (h: HtmlBuilder<Message>): Html =>
  h.p([h.Role('status'), h.Class('text-green-700')], ['Saved'])

const failureStatusView = (h: HtmlBuilder<Message>, text: string): Html =>
  h.p([h.Role('status'), h.Class('text-red-700')], [text])

const alertView = (h: HtmlBuilder<Message>, text: string): Html =>
  h.p([h.Role('alert'), h.Class('text-red-700')], [text])

const registrationFeedbackView = (
  h: HtmlBuilder<Message>,
  submission: Form.Submission<typeof registrationForm>,
): Html =>
  registrationForm.Submission.match<Html>(submission, {
    Idle: () => statusView(h, 'Ready'),
    Validating: () => statusView(h, 'Checking fields…'),
    Submitting: () => statusView(h, 'Saving…'),
    Succeeded: () => successStatusView(h),
    Failed: () => failureStatusView(h, 'Not registered'),
  })

const registrationErrorText = RegistrationRejection.match({
  EmailTaken: () => 'This email is already registered',
  RegistrationUnavailable: () =>
    'Registration is unavailable. Try again later.',
})

const profileFeedbackView = (
  h: HtmlBuilder<Message>,
  submission: Form.Submission<typeof profileForm>,
): Html =>
  profileForm.Submission.match<Html>(submission, {
    Idle: () => statusView(h, 'Ready'),
    Validating: () => statusView(h, 'Checking fields…'),
    Submitting: () => statusView(h, 'Saving…'),
    Succeeded: () => successStatusView(h),
    Failed: () => failureStatusView(h, 'Not saved'),
  })

const topicOptionView = (
  h: HtmlBuilder<Message>,
  topic: Topic,
  selectedTopic: Topic | null,
): Html =>
  h.keyed('option')(
    topic,
    [h.Value(topic), h.Selected(topic === selectedTopic)],
    [topic],
  )

const mainTopicView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const mainTopicFieldView = registrationForm.fieldView(
    model.registration,
    'mainTopic',
  )
  const isInvalid = Array.isReadonlyArrayNonEmpty(mainTopicFieldView.errors)

  return h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.For('registration-main-topic'), h.Class('block font-medium')],
        ['Main topic'],
      ),
      h.select(
        [
          h.Id('registration-main-topic'),
          h.AriaInvalid(isInvalid),
          h.AriaDescribedBy('registration-main-topic-errors'),
          h.Class('w-full rounded border border-slate-300 px-3 py-2'),
          h.OnChange(value =>
            toRegistrationMessage(
              registrationForm.changed('mainTopic', toTopicInput(value)),
            ),
          ),
          h.OnBlur(
            toRegistrationMessage(registrationForm.blurred('mainTopic')),
          ),
        ],
        [
          h.option(
            [h.Value(''), h.Selected(mainTopicFieldView.input === null)],
            ['Choose a topic'],
          ),
          ...Array.map(Topic.literals, topic =>
            topicOptionView(h, topic, mainTopicFieldView.input),
          ),
        ],
      ),
      h.div(
        [h.Id('registration-main-topic-errors')],
        Array.map(mainTopicFieldView.errors, error =>
          h.p([h.Class('text-sm text-red-700')], [error]),
        ),
      ),
    ],
  )
}

const registrationView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const submission = registrationForm.submission(model.registration)
  const maybeFormError = registrationForm.formError(model.registration)

  return h.section(
    [
      h.AriaLabel('Registration'),
      h.Class('space-y-4 rounded-xl bg-white p-6 shadow'),
    ],
    [
      h.h2([h.Class('text-xl font-semibold')], ['Registration']),
      h.form(
        [h.OnSubmit(Message.SubmittedRegistrationForm()), h.Class('space-y-4')],
        [
          textInputView(h, {
            id: 'registration-email',
            label: 'Registration email',
            fieldView: registrationForm.fieldView(model.registration, 'email'),
            onInput: input =>
              toRegistrationMessage(registrationForm.changed('email', input)),
            onBlur: toRegistrationMessage(registrationForm.blurred('email')),
          }),
          textInputView(h, {
            id: 'registration-name',
            label: 'Your name',
            fieldView: registrationForm.fieldView(
              model.registration,
              'fullName',
            ),
            onInput: input =>
              toRegistrationMessage(
                registrationForm.changed('fullName', input),
              ),
            onBlur: toRegistrationMessage(registrationForm.blurred('fullName')),
          }),
          textInputView(h, {
            id: 'registration-age',
            label: 'Your age',
            fieldView: registrationForm.fieldView(model.registration, 'age'),
            onInput: input =>
              toRegistrationMessage(registrationForm.changed('age', input)),
            onBlur: toRegistrationMessage(registrationForm.blurred('age')),
          }),
          mainTopicView(model, h),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(registrationForm.isSubmitPending(model.registration)),
              h.Class('rounded bg-indigo-700 px-4 py-2 text-white'),
            ],
            ['Register'],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedResetRegistration()),
              h.Class('ml-3 rounded border px-4 py-2'),
            ],
            ['Reset registration'],
          ),
        ],
      ),
      registrationFeedbackView(h, submission),
      ...Option.toArray(
        Option.map(maybeFormError, error =>
          alertView(h, registrationErrorText(error)),
        ),
      ),
      h.p(
        [h.Class('text-sm')],
        [`Attempts: ${registrationForm.submitCount(model.registration)}`],
      ),
      h.p(
        [h.Class('text-sm')],
        [
          `Registered: ${Array.match(model.registeredEmails, {
            onEmpty: () => 'nobody yet',
            onNonEmpty: emails => Array.join(emails, ', '),
          })}`,
        ],
      ),
    ],
  )
}

const topicCheckboxView = (
  h: HtmlBuilder<Message>,
  topic: Topic,
  isChecked: boolean,
): Html =>
  h.keyed('label')(
    topic,
    [h.For(`profile-topic-${topic}`), h.Class('flex items-center gap-2')],
    [
      h.input([
        h.Id(`profile-topic-${topic}`),
        h.Type('checkbox'),
        h.Checked(isChecked),
        h.OnClick(Message.ClickedProfileTopic({ topic })),
      ]),
      topic,
    ],
  )

const checkboxView = (
  h: HtmlBuilder<Message>,
  id: string,
  label: string,
  isChecked: boolean,
  onClick: Message,
): Html =>
  h.label(
    [h.For(id), h.Class('flex items-center gap-2')],
    [
      h.input([
        h.Id(id),
        h.Type('checkbox'),
        h.Checked(isChecked),
        h.OnClick(onClick),
      ]),
      label,
    ],
  )

const profileView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const topicsFieldView = profileForm.fieldView(model.profile, 'topics')
  const submission = profileForm.submission(model.profile)
  const maybeFormError = profileForm.formError(model.profile)

  return h.section(
    [
      h.AriaLabel('Profile'),
      h.Class('space-y-4 rounded-xl bg-white p-6 shadow'),
    ],
    [
      h.h2([h.Class('text-xl font-semibold')], ['Edit profile']),
      h.form(
        [h.OnSubmit(Message.SubmittedProfileForm()), h.Class('space-y-4')],
        [
          textInputView(h, {
            id: 'profile-email',
            label: 'Profile email',
            fieldView: profileForm.fieldView(model.profile, 'email'),
            onInput: input =>
              toProfileMessage(profileForm.changed('email', input)),
            onBlur: toProfileMessage(profileForm.blurred('email')),
          }),
          textInputView(h, {
            id: 'profile-name',
            label: 'Display name',
            fieldView: profileForm.fieldView(model.profile, 'displayName'),
            onInput: input =>
              toProfileMessage(profileForm.changed('displayName', input)),
            onBlur: toProfileMessage(profileForm.blurred('displayName')),
          }),
          h.fieldset(
            [h.Class('space-y-2')],
            [
              h.legend([h.Class('font-medium')], ['Topics']),
              ...Array.map(Topic.literals, topic =>
                topicCheckboxView(
                  h,
                  topic,
                  topicsFieldView.input.includes(topic),
                ),
              ),
            ],
          ),
          h.fieldset(
            [h.Class('space-y-2')],
            [
              h.legend([h.Class('font-medium')], ['Email']),
              checkboxView(
                h,
                'profile-email-updates',
                'Email me updates',
                profileForm.fieldView(model.profile, 'isSubscribed').input,
                Message.ClickedEmailUpdates(),
              ),
              checkboxView(
                h,
                'profile-weekly-digest',
                'Weekly digest',
                profileForm.fieldView(model.profile, 'isDigestEnabled').input,
                Message.ClickedWeeklyDigest(),
              ),
            ],
          ),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(profileForm.isSubmitPending(model.profile)),
              h.Class('rounded bg-indigo-700 px-4 py-2 text-white'),
            ],
            ['Save profile'],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedResetProfile()),
              h.Class('ml-3 rounded border px-4 py-2'),
            ],
            ['Reset profile'],
          ),
        ],
      ),
      profileFeedbackView(h, submission),
      ...Option.toArray(
        Option.map(maybeFormError, error => alertView(h, error)),
      ),
      h.p(
        [h.Class('text-sm')],
        [`Attempts: ${profileForm.submitCount(model.profile)}`],
      ),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Experimental Form',
  body: h.main(
    [h.Class('min-h-screen bg-slate-100 px-6 py-10 text-slate-900')],
    [
      h.div(
        [h.Class('mx-auto max-w-3xl space-y-6')],
        [
          h.h1([h.Class('text-3xl font-bold')], ['Experimental Form']),
          h.p(
            [],
            [
              'Two Forms share one email field definition. Try blocked@example.com for the async email check, taken@example.com for a server error on the registration email field, or down@example.com for an error on the whole form. Type 12a as an age to see a typed field keep your text. Turning off email updates also turns off the weekly digest. Reset while saving and the late result is ignored.',
            ],
          ),
          registrationView(model, h),
          profileView(model, h),
        ],
      ),
    ],
  ),
})
