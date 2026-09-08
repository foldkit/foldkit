import { FieldValidation } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import {
  Message,
  type Model,
  SubmitForm,
  ValidateEmail,
  initialModel,
  update,
} from './main'

const validModel: Model = evo(initialModel, {
  name: () => FieldValidation.Valid({ value: 'Alice' }),
  email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
})

describe('update', () => {
  describe('name field', () => {
    test('typing a long name produces a Valid field', () => {
      story(
        update,
        given(initialModel),
        message(Message.UpdatedName({ value: 'Alice' })),
        model(model => {
          expect(model.name._tag).toBe('Valid')
          expect(model.name.value).toBe('Alice')
        }),
      )
    })

    test('typing a short name produces an Invalid field with the min-length error', () => {
      story(
        update,
        given(initialModel),
        message(Message.UpdatedName({ value: 'A' })),
        model(model => {
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
      story(
        update,
        given(initialModel),
        message(Message.UpdatedEmail({ value: 'alice@example.com' })),
        model(model => {
          expect(model.email._tag).toBe('Validating')
        }),
        Command.expectHas(ValidateEmail),
        Command.resolve(
          ValidateEmail,
          Message.CompletedValidateEmail({
            field: FieldValidation.Valid({ value: 'alice@example.com' }),
          }),
        ),
        model(model => {
          expect(model.email._tag).toBe('Valid')
        }),
      )
    })

    test('typing a malformed email produces Invalid without an async command', () => {
      story(
        update,
        given(initialModel),
        message(Message.UpdatedEmail({ value: 'not-an-email' })),
        Command.expectNone(),
        model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      )
    })

    test('a validation result for a superseded email value is ignored', () => {
      const inFlightModel: Model = evo(initialModel, {
        email: () => FieldValidation.Validating({ value: 'alice@example.com' }),
      })

      story(
        update,
        given(inFlightModel),
        message(
          Message.CompletedValidateEmail({
            field: FieldValidation.Valid({ value: 'old@example.com' }),
          }),
        ),
        model(model => {
          expect(model.email._tag).toBe('Validating')
        }),
      )
    })

    test('a validation result for the current email value updates the field', () => {
      const inFlightModel: Model = evo(initialModel, {
        email: () => FieldValidation.Validating({ value: 'taken@example.com' }),
      })

      story(
        update,
        given(inFlightModel),
        message(
          Message.CompletedValidateEmail({
            field: FieldValidation.Invalid({
              value: 'taken@example.com',
              errors: ['This email is already on our waitlist'],
            }),
          }),
        ),
        model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      )
    })
  })

  describe('message text field', () => {
    test('UpdatedMessageText stores the value as Valid', () => {
      story(
        update,
        given(initialModel),
        message(Message.UpdatedMessageText({ value: 'Hello there.' })),
        model(model => {
          expect(model.messageText._tag).toBe('Valid')
          expect(model.messageText.value).toBe('Hello there.')
        }),
      )
    })
  })

  describe('submission', () => {
    test('ClickedFormSubmit on an invalid form is ignored', () => {
      story(
        update,
        given(initialModel),
        message(Message.ClickedFormSubmit()),
        Command.expectNone(),
        model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
        }),
      )
    })

    test('ClickedFormSubmit on a valid form fires SubmitForm and enters Submitting', () => {
      story(
        update,
        given(validModel),
        message(Message.ClickedFormSubmit()),
        model(model => {
          expect(model.submission._tag).toBe('Submitting')
        }),
        Command.expectHas(SubmitForm),
        Command.resolve(
          SubmitForm,
          Message.SucceededSubmitForm({ name: 'Alice' }),
        ),
        model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
          if (model.submission._tag === 'SubmitSuccess') {
            expect(model.submission.confirmationText).toContain('Alice')
          }
        }),
      )
    })

    test('FailedSubmitForm sets SubmitError', () => {
      story(
        update,
        given(validModel),
        message(Message.ClickedFormSubmit()),
        Command.resolve(SubmitForm, Message.FailedSubmitForm()),
        model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      )
    })
  })
})
