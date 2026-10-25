import { Valid, Validating } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { SubmitForm, ValidateEmail } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { Submission } from './model'
import { isFormValid, validateEmail, validateName } from './validation'

export const update = ApplicationComposition.makeUpdate({
  UpdatedName: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ name: () => validateName(value) }),
  ),
  UpdatedEmail: (model, { value }) => {
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
  CompletedValidateEmail: (model, { field }) => {
    if (field.value === model.email.value) {
      return { model: modifyFields(model, { email: () => field }) }
    } else {
      return { model }
    }
  },
  UpdatedMessageText: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ messageText: () => Valid({ value }) }),
  ),
  ClickedFormSubmit: model => {
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
  SucceededSubmitForm: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ name }) => ({
      submission: () =>
        Submission.SubmitSuccess({
          confirmationText: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
        }),
    }),
  ),
  FailedSubmitForm: ApplicationDefinition.makeFieldsStep(() => ({
    submission: () =>
      Submission.SubmitError({
        error:
          'Sorry, there was an error adding you to the waitlist. Please try again.',
      }),
  })),
})
