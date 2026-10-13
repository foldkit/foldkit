import { Array, Duration, Effect, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { makeRules } from 'foldkit/fieldValidation'
import { type Attribute, Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { emailField } from './fields'

// SUBMISSION

const SUBMISSION_DELAY_MS = 500
const submitEmail = (email: string): Effect.Effect<void, string> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(SUBMISSION_DELAY_MS))
    if (email === 'taken@example.com') {
      return yield* Effect.fail('This email is already registered')
    }
  })

// MODEL

const Topic = Schema.Literals(['Foldkit', 'Effect', 'Accessibility'])
type Topic = typeof Topic.Type

export const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    email: emailField,
    name: Form.field({
      schema: Schema.String,
      initial: { value: '' },
      rules: makeRules({
        required: 'Enter your name',
      }),
    }),
  },
  submit: {
    error: Schema.String,
    execute: ({ email }) => submitEmail(email),
  },
})
export const profileForm = Form.define({
  name: 'Profile',
  fields: {
    email: emailField,
    topics: Form.field({ schema: Schema.Array(Topic), initial: { value: [] } }),
    displayName: Form.field({
      schema: Schema.String,
      initial: { value: '' },
      rules: makeRules({
        required: 'Enter a display name',
      }),
    }),
  },
  submit: {
    error: Schema.String,
    execute: ({ email }) => submitEmail(email),
  },
})
export const Model = Schema.Struct({
  registration: registrationForm.Model,
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
    profile: profileForm.init({
      email: { value: 'reader@example.com' },
      displayName: { value: 'Reader' },
    }),
  }),
})

// UPDATE

const registration = registrationForm.lift<Model, Message>({
  parentField: 'registration',
  toParentMessage: message => Message.GotRegistrationMessage({ message }),
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
      const topics = profileForm.field(model.profile, 'topics').value
      const nextTopics = topics.includes(topic)
        ? Array.filter(topics, selectedTopic => selectedTopic !== topic)
        : Array.append(topics, topic)

      return profile.fold(
        model,
        profileForm.changed('topics', { value: nextTopics }),
      )
    },
    SubmittedProfile: () => profile.submit(model),
    ClickedResetRegistration: () => registration.reset(model),
    ClickedResetProfile: () => profile.reset(model),
  })

// VIEW

const textField = (
  h: HtmlBuilder<Message>,
  id: string,
  label: string,
  field: Form.FieldView<typeof Schema.String>,
  attrs: ReadonlyArray<Attribute<Message>>,
): Html =>
  h.div(
    [h.Class('space-y-1')],
    [
      h.label([h.For(id), h.Class('block font-medium')], [label]),
      h.input([
        h.Id(id),
        h.Type('text'),
        h.Value(field.value),
        h.Class('w-full rounded border border-slate-300 px-3 py-2'),
        ...attrs,
      ]),
      ...Array.map(field.errors, error =>
        h.p([h.Class('text-sm text-red-700')], [error]),
      ),
      h.p(
        [h.Class('text-xs text-slate-500')],
        [field.meta.isDirty ? 'Edited' : 'Pristine'],
      ),
    ],
  )
const feedback = (
  h: HtmlBuilder<Message>,
  submission: Form.Submission<void, string>,
): Html =>
  registrationForm.Submission.match<Html>(submission, {
    Idle: () => h.p([h.Role('status')], ['Ready']),
    Validating: () => h.p([h.Role('status')], ['Checking fields…']),
    Submitting: () => h.p([h.Role('status')], ['Saving…']),
    Succeeded: () =>
      h.p([h.Role('status'), h.Class('text-green-700')], ['Saved']),
    Failed: ({ error }) =>
      h.p([h.Role('status'), h.Class('text-red-700')], [error]),
  })
const registrationView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const email = registrationForm.field(model.registration, 'email')
  const name = registrationForm.field(model.registration, 'name')
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
          textField(h, 'registration-email', 'Registration email', email, [
            h.OnInput(value =>
              Message.GotRegistrationMessage({
                message: registrationForm.changed('email', { value }),
              }),
            ),
            h.OnBlur(
              Message.GotRegistrationMessage({
                message: registrationForm.blurred('email'),
              }),
            ),
          ]),
          textField(h, 'registration-name', 'Your name', name, [
            h.OnInput(value =>
              Message.GotRegistrationMessage({
                message: registrationForm.changed('name', { value }),
              }),
            ),
            h.OnBlur(
              Message.GotRegistrationMessage({
                message: registrationForm.blurred('name'),
              }),
            ),
          ]),
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
      feedback(h, submission),
      h.p(
        [h.Class('text-sm')],
        [`Attempts: ${registrationForm.submitCount(model.registration)}`],
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
          textField(h, 'profile-email', 'Profile email', email, [
            h.OnInput(value =>
              Message.GotProfileMessage({
                message: profileForm.changed('email', { value }),
              }),
            ),
            h.OnBlur(
              Message.GotProfileMessage({
                message: profileForm.blurred('email'),
              }),
            ),
          ]),
          textField(h, 'profile-name', 'Display name', displayName, [
            h.OnInput(value =>
              Message.GotProfileMessage({
                message: profileForm.changed('displayName', { value }),
              }),
            ),
            h.OnBlur(
              Message.GotProfileMessage({
                message: profileForm.blurred('displayName'),
              }),
            ),
          ]),
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
                      h.Checked(topics.value.includes(topic)),
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
      feedback(h, submission),
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
              'Two independent Forms reuse an email field. Profile topics use an array field with ordinary checkboxes. Try blocked@example.com to see async validation, or taken@example.com to see a submission failure. Reset while saving to ignore the late result.',
            ],
          ),
          registrationView(model, h),
          profileView(model, h),
        ],
      ),
    ],
  ),
})
