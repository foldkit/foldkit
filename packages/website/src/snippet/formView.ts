import { Array } from 'effect'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import { Message, type Model, registrationForm } from './formParent'

const isPending = registrationForm.Submission.isAnyOf([
  'Validating',
  'Submitting',
])

const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const email = registrationForm.fieldView(model.registration, 'email')
  const submission = registrationForm.submission(model.registration)

  return {
    title: 'Registration',
    body: h.form(
      [h.OnSubmit(Message.SubmittedRegistrationForm())],
      [
        h.label([h.For('email')], ['Email']),
        h.input([
          h.Id('email'),
          h.Value(email.input),
          h.OnInput(value =>
            Message.GotRegistrationMessage({
              message: registrationForm.changed('email', value),
            }),
          ),
          h.OnBlur(
            Message.GotRegistrationMessage({
              message: registrationForm.blurred('email'),
            }),
          ),
        ]),
        ...Array.map(email.errors, error => h.p([], [error])),
        h.button(
          [h.Type('submit'), h.Disabled(isPending(submission))],
          ['Register'],
        ),
        h.button(
          [h.Type('button'), h.OnClick(Message.ClickedResetRegistration())],
          ['Reset'],
        ),
        h.p(
          [h.Role('status')],
          [
            registrationForm.Submission.match(submission, {
              Idle: () => 'Ready',
              Validating: () => 'Checking fields…',
              Submitting: () => 'Saving…',
              Succeeded: ({ data }) => `Registered ${data.userId}`,
              Failed: ({ error }) => error,
            }),
          ],
        ),
      ],
    ),
  }
}
