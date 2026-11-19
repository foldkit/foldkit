import { Array, Effect, Schema } from 'effect'
import { Form } from 'foldkit/experimental'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

type TextSchema = Form.FieldSchema & Readonly<{ Encoded: string }>

const textFieldView = <Name extends string, Model, Message, ParentMessage>(
  h: HtmlBuilder<ParentMessage>,
  // Any Form with a text field named `name` fits, and it decides Model and Message
  form: Form.Fields<Record<Name, TextSchema>, Model, Message>,
  model: Model,
  name: Name,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const { input, errors } = form.fieldView(model, name)

  return h.div(
    [],
    [
      h.label([h.For(name)], [name]),
      h.input([
        h.Id(name),
        h.Value(input),
        h.OnInput(value => toParentMessage(form.changed(name, value))),
        h.OnBlur(toParentMessage(form.blurred(name))),
      ]),
      ...Array.map(errors, error => h.p([], [error])),
    ],
  )
}

const sharedFields = {
  email: Form.field({ schema: Schema.String, initial: '' }),
}

const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    ...sharedFields,
    age: Form.field({ schema: Schema.NumberFromString, initial: '' }),
  },
  submit: { error: Schema.String, execute: () => Effect.void },
})

const profileForm = Form.define({
  name: 'Profile',
  fields: {
    ...sharedFields,
    isPublic: Form.field({ schema: Schema.Boolean, initial: false }),
  },
  submit: {
    context: Schema.Struct({ profileId: Schema.String }),
    execute: () => Effect.void,
  },
})

const sharedEmail = <Model, Message>(
  form: Form.Fields<Form.FieldSchemasOf<typeof sharedFields>, Model, Message>,
  model: Model,
) => form.inputs(model).email

const Model = Schema.Struct({
  registration: registrationForm.Model,
  profile: profileForm.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotRegistrationMessage: { message: registrationForm.Message },
  GotProfileMessage: { message: profileForm.Message },
})
type Message = typeof Message.Type

const fieldsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      textFieldView(h, registrationForm, model.registration, 'email', message =>
        Message.GotRegistrationMessage({ message }),
      ),
      textFieldView(h, registrationForm, model.registration, 'age', message =>
        Message.GotRegistrationMessage({ message }),
      ),
      textFieldView(h, profileForm, model.profile, 'email', message =>
        Message.GotProfileMessage({ message }),
      ),
      h.p(
        [],
        [
          `Emails: ${sharedEmail(registrationForm, model.registration)}, ${sharedEmail(profileForm, model.profile)}`,
        ],
      ),
    ],
  )
