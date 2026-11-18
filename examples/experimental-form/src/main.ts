import { Array, Duration, Effect, Schema, SchemaTransformation } from 'effect'
import { Runtime, Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'
import { type Attribute, Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { emailField } from './fields'

// SUBMISSION

const SUBMISSION_DELAY_MS = 500
const TAKEN_EMAIL = 'taken@example.com'
const UNAVAILABLE_EMAIL = 'down@example.com'
const MINIMUM_AGE = 13

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

const AgeInput = Schema.String.check(
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
    name: Form.field({
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
        rules: [
          [age => age >= MINIMUM_AGE, `You must be at least ${MINIMUM_AGE}`],
        ],
      }),
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
  SubmittedRegistration: {},
  SubmittedProfile: {},
  ClickedProfileTopic: { topic: Topic },
  ClickedResetRegistration: {},
  ClickedResetProfile: {},
})
export type Message = typeof Message.Type

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

const registration = registrationForm.lift<Model, Message>({
  parentField: 'registration',
  toParentMessage: message => Message.GotRegistrationMessage({ message }),
  foldOutMessage: foldRegistrationOutMessage,
})
const profile = profileForm.lift<Model, Message>({
  parentField: 'profile',
  toParentMessage: message => Message.GotProfileMessage({ message }),
})
export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotRegistrationMessage: ({ message }) => registration.fold(model, message),
    GotProfileMessage: ({ message }) => profile.fold(model, message),
    SubmittedRegistration: () => registration.submit(model),
    ClickedProfileTopic: ({ topic }) => {
      const topics = profileForm.field(model.profile, 'topics').input
      const nextTopics = topics.includes(topic)
        ? Array.filter(topics, selectedTopic => selectedTopic !== topic)
        : Array.append(topics, topic)

      return profile.fold(model, profileForm.changed('topics', nextTopics))
    },
    SubmittedProfile: () =>
      profile.submit(model, { profileId: model.profileId }),
    ClickedResetRegistration: () => registration.reset(model),
    ClickedResetProfile: () => profile.reset(model),
  })

// VIEW

type TextFieldView = Readonly<{
  input: string
  errors: ReadonlyArray<string>
  meta: Readonly<{ isEdited: boolean }>
}>

const textField = (
  h: HtmlBuilder<Message>,
  id: string,
  label: string,
  field: TextFieldView,
  attrs: ReadonlyArray<Attribute<Message>>,
): Html =>
  h.div(
    [h.Class('space-y-1')],
    [
      h.label([h.For(id), h.Class('block font-medium')], [label]),
      h.input([
        h.Id(id),
        h.Type('text'),
        h.Value(field.input),
        h.Class('w-full rounded border border-slate-300 px-3 py-2'),
        ...attrs,
      ]),
      ...Array.map(field.errors, error =>
        h.p([h.Class('text-sm text-red-700')], [error]),
      ),
      h.p(
        [h.Class('text-xs text-slate-500')],
        [field.meta.isEdited ? 'Edited' : 'Pristine'],
      ),
    ],
  )
const status = (h: HtmlBuilder<Message>, text: string): Html =>
  h.p([h.Role('status')], [text])
const successStatus = (h: HtmlBuilder<Message>): Html =>
  h.p([h.Role('status'), h.Class('text-green-700')], ['Saved'])
const failureStatus = (h: HtmlBuilder<Message>, text: string): Html =>
  h.p([h.Role('status'), h.Class('text-red-700')], [text])

const registrationFeedback = (
  h: HtmlBuilder<Message>,
  submission: Form.Submission<typeof registrationForm>,
): Html =>
  registrationForm.Submission.match<Html>(submission, {
    Idle: () => status(h, 'Ready'),
    Validating: () => status(h, 'Checking fields…'),
    Submitting: () => status(h, 'Saving…'),
    Succeeded: () => successStatus(h),
    Failed: ({ error }) =>
      RegistrationRejection.match<Html>(error, {
        EmailTaken: () => failureStatus(h, 'Fix the highlighted field'),
        RegistrationUnavailable: () =>
          failureStatus(h, 'Registration is unavailable. Try again later.'),
      }),
  })
const profileFeedback = (
  h: HtmlBuilder<Message>,
  submission: Form.Submission<typeof profileForm>,
): Html =>
  profileForm.Submission.match<Html>(submission, {
    Idle: () => status(h, 'Ready'),
    Validating: () => status(h, 'Checking fields…'),
    Submitting: () => status(h, 'Saving…'),
    Succeeded: () => successStatus(h),
    Failed: ({ error }) => failureStatus(h, error),
  })
const registrationInput = (
  h: HtmlBuilder<Message>,
  name: 'email' | 'name' | 'age',
): ReadonlyArray<Attribute<Message>> => [
  h.OnInput(input =>
    Message.GotRegistrationMessage({
      message: registrationForm.changed(name, input),
    }),
  ),
  h.OnBlur(
    Message.GotRegistrationMessage({
      message: registrationForm.blurred(name),
    }),
  ),
]
const profileInput = (
  h: HtmlBuilder<Message>,
  name: 'email' | 'displayName',
): ReadonlyArray<Attribute<Message>> => [
  h.OnInput(input =>
    Message.GotProfileMessage({
      message: profileForm.changed(name, input),
    }),
  ),
  h.OnBlur(
    Message.GotProfileMessage({
      message: profileForm.blurred(name),
    }),
  ),
]
const registrationView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const email = registrationForm.field(model.registration, 'email')
  const name = registrationForm.field(model.registration, 'name')
  const age = registrationForm.field(model.registration, 'age')
  const submission = registrationForm.submission(model.registration)
  return h.section(
    [
      h.AriaLabel('Registration'),
      h.Class('space-y-4 rounded-xl bg-white p-6 shadow'),
    ],
    [
      h.h2([h.Class('text-xl font-semibold')], ['Registration']),
      h.form(
        [h.OnSubmit(Message.SubmittedRegistration()), h.Class('space-y-4')],
        [
          textField(
            h,
            'registration-email',
            'Registration email',
            email,
            registrationInput(h, 'email'),
          ),
          textField(
            h,
            'registration-name',
            'Your name',
            name,
            registrationInput(h, 'name'),
          ),
          textField(
            h,
            'registration-age',
            'Your age',
            age,
            registrationInput(h, 'age'),
          ),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(
                submission._tag === 'Validating' ||
                  submission._tag === 'Submitting',
              ),
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
      registrationFeedback(h, submission),
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
const profileView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const email = profileForm.field(model.profile, 'email')
  const displayName = profileForm.field(model.profile, 'displayName')
  const topics = profileForm.field(model.profile, 'topics')
  const submission = profileForm.submission(model.profile)
  return h.section(
    [
      h.AriaLabel('Profile'),
      h.Class('space-y-4 rounded-xl bg-white p-6 shadow'),
    ],
    [
      h.h2([h.Class('text-xl font-semibold')], ['Edit profile']),
      h.form(
        [h.OnSubmit(Message.SubmittedProfile()), h.Class('space-y-4')],
        [
          textField(
            h,
            'profile-email',
            'Profile email',
            email,
            profileInput(h, 'email'),
          ),
          textField(
            h,
            'profile-name',
            'Display name',
            displayName,
            profileInput(h, 'displayName'),
          ),
          h.fieldset(
            [h.Class('space-y-2')],
            [
              h.legend([h.Class('font-medium')], ['Topics']),
              ...Array.map(Topic.literals, topic =>
                h.keyed('label')(
                  topic,
                  [
                    h.For(`profile-topic-${topic}`),
                    h.Class('flex items-center gap-2'),
                  ],
                  [
                    h.input([
                      h.Id(`profile-topic-${topic}`),
                      h.Type('checkbox'),
                      h.Checked(topics.input.includes(topic)),
                      h.OnClick(Message.ClickedProfileTopic({ topic })),
                    ]),
                    topic,
                  ],
                ),
              ),
            ],
          ),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(
                submission._tag === 'Validating' ||
                  submission._tag === 'Submitting',
              ),
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
      profileFeedback(h, submission),
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
              'Two independent Forms reuse an email field. The age field keeps whatever you type and shows an error until it reads as a number. Profile topics use an array field with ordinary checkboxes. Try blocked@example.com to see async validation, taken@example.com to see a server error on the email field, or down@example.com to see a form-level failure. Reset while saving to ignore the late result.',
            ],
          ),
          registrationView(model, h),
          profileView(model, h),
        ],
      ),
    ],
  ),
})
