import { FieldValidation, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedFormSubmit,
  type Model,
  SubmitForm,
  SubmittedForm,
  UpdatedEmail,
  UpdatedMessageText,
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
        }),
        Story.Command.expectHas(ValidateEmail),
        Story.Command.resolve(
          ValidateEmail,
          ValidatedEmail({
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

    test('a validation result for a superseded email value is ignored', () => {
      const inFlightModel: Model = {
        ...initialModel,
        email: FieldValidation.Validating({ value: 'alice@example.com' }),
      }

      Story.story(
        update,
        Story.with(inFlightModel),
        Story.message(
          ValidatedEmail({
            field: FieldValidation.Valid({ value: 'old@example.com' }),
          }),
        ),
        Story.model(model => {
          expect(model.email._tag).toBe('Validating')
        }),
      )
    })

    test('a validation result for the current email value updates the field', () => {
      const inFlightModel: Model = {
        ...initialModel,
        email: FieldValidation.Validating({ value: 'taken@example.com' }),
      }

      Story.story(
        update,
        Story.with(inFlightModel),
        Story.message(
          ValidatedEmail({
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

  describe('message text field', () => {
    test('UpdatedMessageText stores the value as Valid', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedMessageText({ value: 'Hello there.' })),
        Story.model(model => {
          expect(model.messageText._tag).toBe('Valid')
          expect(model.messageText.value).toBe('Hello there.')
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
            messageText: '',
          }),
        ),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
          if (model.submission._tag === 'SubmitSuccess') {
            expect(model.submission.confirmationText).toContain('Alice')
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
            messageText: '',
          }),
        ),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      )
    })
  })
})
