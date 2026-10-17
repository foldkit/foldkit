import { Valid, Validating } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { SubmitForm, ValidateEmail } from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { Submission } from './model'
import { isFormValid, validateEmail, validateName } from './validation'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedName: ({ value }) => ({
      model: modifyFields(model, { name: () => validateName(value) }),
    }),
    UpdatedEmail: ({ value }) => {
      const validateEmailResult = validateEmail(value)
      if (validateEmailResult._tag === 'Valid') {
        return {
          model: modifyFields(model, { email: () => Validating({ value }) }),
          commands: [ValidateEmail({ email: value })],
        }
      } else {
        return {
          model: modifyFields(model, { email: () => validateEmailResult }),
        }
      }
    },
    CompletedValidateEmail: ({ field }) => {
      if (field.value === model.email.value) {
        return { model: modifyFields(model, { email: () => field }) }
      } else {
        return { model }
      }
    },
    UpdatedMessageText: ({ value }) => ({
      model: modifyFields(model, { messageText: () => Valid({ value }) }),
    }),
    ClickedFormSubmit: () => {
      if (model.submission._tag === 'Submitting') {
        return { model }
      }

      if (!isFormValid(model)) {
        return { model }
      }

      return {
        model: modifyFields(model, {
          submission: () => Submission.Submitting(),
        }),
        commands: [
          SubmitForm({
            name: model.name.value,
            email: model.email.value,
            messageText: model.messageText.value,
          }),
        ],
      }
    },
    SucceededSubmitForm: ({ name }) => ({
      model: modifyFields(model, {
        submission: () =>
          Submission.SubmitSuccess({
            confirmationText: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
          }),
      }),
    }),
    FailedSubmitForm: () => ({
      model: modifyFields(model, {
        submission: () =>
          Submission.SubmitError({
            error:
              'Sorry, there was an error adding you to the waitlist. Please try again.',
          }),
      }),
    }),
  }),
)
