import { FieldValidation, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedFormSubmit,
  type Model,
  SubmitForm,
  SubmittedForm,
  UpdatedEmail,
  UpdatedMessage,
  UpdatedName,
  ValidateEmail,
  ValidatedEmail,
  initialModel,
  update,
} from './main'

const validModel: Model = {
  ...initialModel,
  name: FieldValidation.Valid({ value: 'Alice' }),
  email: FieldValidation.Valid({ value: 'alice@example.com' }),
}

describe('update', () => {
  describe('name field', () => {
    test('typing a long name produces a Valid field', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedName({ value: 'Alice' })),
        Story.model(model => {
          expect(model.name._tag).toBe('Valid')
          expect(model.name.value).toBe('Alice')
        }),
      )
    })

    test('typing a short name produces an Invalid field with the min-length error', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedName({ value: 'A' })),
        Story.model(model => {
          expect(model.name._tag).toBe('Invalid')
          if (model.name._tag === 'Invalid') {
            expect(model.name.errors).toContain(
              'Name must be at least 2 characters',
            )
          }
        }),
      )
    })
  })

  describe('email field', () => {
    test('typing a well-formed email transitions to Validating and fires ValidateEmail', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedEmail({ value: 'alice@example.com' })),
        Story.model(model => {
          expect(model.email._tag).toBe('Validating')
          expect(model.emailValidationId).toBe(1)
        }),
        Story.Command.expectHas(ValidateEmail),
        Story.Command.resolve(
          ValidateEmail,
          ValidatedEmail({
            validationId: 1,
            field: FieldValidation.Valid({ value: 'alice@example.com' }),
          }),
        ),
        Story.model(model => {
          expect(model.email._tag).toBe('Valid')
        }),
      )
    })

    test('typing a malformed email produces Invalid without an async command', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedEmail({ value: 'not-an-email' })),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      )
    })

    test('stale ValidatedEmail responses are ignored', () => {
      const inFlightModel: Model = {
        ...initialModel,
        email: FieldValidation.Validating({ value: 'alice@example.com' }),
        emailValidationId: 5,
      }

      Story.story(
        update,
        Story.with(inFlightModel),
        Story.message(
          ValidatedEmail({
            validationId: 3,
            field: FieldValidation.Valid({ value: 'old@example.com' }),
          }),
        ),
        Story.model(model => {
          expect(model.email._tag).toBe('Validating')
          expect(model.emailValidationId).toBe(5)
        }),
      )
    })

    test('async result for the current validationId updates the email field', () => {
      const inFlightModel: Model = {
        ...initialModel,
        email: FieldValidation.Validating({ value: 'taken@example.com' }),
        emailValidationId: 2,
      }

      Story.story(
        update,
        Story.with(inFlightModel),
        Story.message(
          ValidatedEmail({
            validationId: 2,
            field: FieldValidation.Invalid({
              value: 'taken@example.com',
              errors: ['This email is already on our waitlist'],
            }),
          }),
        ),
        Story.model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      )
    })
  })

  describe('message field', () => {
    test('UpdatedMessage stores the value as Valid', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedMessage({ value: 'Hello there.' })),
        Story.model(model => {
          expect(model.message._tag).toBe('Valid')
          expect(model.message.value).toBe('Hello there.')
        }),
      )
    })
  })

  describe('submission', () => {
    test('ClickedFormSubmit on an invalid form is ignored', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ClickedFormSubmit()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
        }),
      )
    })

    test('ClickedFormSubmit on a valid form fires SubmitForm and enters Submitting', () => {
      Story.story(
        update,
        Story.with(validModel),
        Story.message(ClickedFormSubmit()),
        Story.model(model => {
          expect(model.submission._tag).toBe('Submitting')
        }),
        Story.Command.expectHas(SubmitForm),
        Story.Command.resolve(
          SubmitForm,
          SubmittedForm({
            success: true,
            name: 'Alice',
            email: 'alice@example.com',
            message: '',
          }),
        ),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
          if (model.submission._tag === 'SubmitSuccess') {
            expect(model.submission.message).toContain('Alice')
          }
        }),
      )
    })

    test('failed SubmittedForm sets SubmitError', () => {
      Story.story(
        update,
        Story.with(validModel),
        Story.message(ClickedFormSubmit()),
        Story.Command.resolve(
          SubmitForm,
          SubmittedForm({
            success: false,
            name: 'Alice',
            email: 'alice@example.com',
            message: '',
          }),
        ),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      )
    })
  })
})
