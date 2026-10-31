import { FieldValidation } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  Message,
  type Model,
  SubmitForm,
  ValidateEmail,
  initialModel,
} from './application'

const validModel: Model = modifyFields(initialModel, {
  name: () => FieldValidation.Valid({ value: 'Alice' }),
  email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
})

describe('update', () => {
  describe('name field', () => {
    it.effect('typing a long name produces a Valid field', () =>
      story(
        ApplicationLive,
        message(Message.UpdatedName({ value: 'Alice' })),
        model(model => {
          expect(model.name._tag).toBe('Valid')
          expect(model.name.value).toBe('Alice')
        }),
      ),
    )

    it.effect(
      'typing a short name produces an Invalid field with the min-length error',
      () =>
        story(
          ApplicationLive,
          message(Message.UpdatedName({ value: 'A' })),
          model(model => {
            expect(model.name._tag).toBe('Invalid')
            if (model.name._tag === 'Invalid') {
              expect(model.name.errors).toContain(
                'Name must be at least 2 characters',
              )
            }
          }),
        ),
    )
  })

  describe('email field', () => {
    it.effect(
      'typing a well-formed email transitions to Validating and fires ValidateEmail',
      () =>
        story(
          ApplicationLive,
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
        ),
    )

    it.effect(
      'typing a malformed email produces Invalid without an async command',
      () =>
        story(
          ApplicationLive,
          message(Message.UpdatedEmail({ value: 'not-an-email' })),
          Command.expectNone(),
          model(model => {
            expect(model.email._tag).toBe('Invalid')
          }),
        ),
    )

    it.effect(
      'a validation result for a superseded email value is ignored',
      () => {
        const inFlightModel: Model = modifyFields(initialModel, {
          email: () =>
            FieldValidation.Validating({ value: 'alice@example.com' }),
        })

        return story(
          ApplicationLive,
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
      },
    )

    it.effect(
      'a validation result for the current email value updates the field',
      () => {
        const inFlightModel: Model = modifyFields(initialModel, {
          email: () =>
            FieldValidation.Validating({ value: 'taken@example.com' }),
        })

        return story(
          ApplicationLive,
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
      },
    )
  })

  describe('message text field', () => {
    it.effect('UpdatedMessageText stores the value as Valid', () =>
      story(
        ApplicationLive,
        message(Message.UpdatedMessageText({ value: 'Hello there.' })),
        model(model => {
          expect(model.messageText._tag).toBe('Valid')
          expect(model.messageText.value).toBe('Hello there.')
        }),
      ),
    )
  })

  describe('submission', () => {
    it.effect('ClickedFormSubmit on an invalid form is ignored', () =>
      story(
        ApplicationLive,
        message(Message.ClickedFormSubmit()),
        Command.expectNone(),
        model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
        }),
      ),
    )

    it.effect(
      'ClickedFormSubmit on a valid form fires SubmitForm and enters Submitting',
      () =>
        story(
          ApplicationLive,
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
        ),
    )

    it.effect('FailedSubmitForm sets SubmitError', () =>
      story(
        ApplicationLive,
        given(validModel),
        message(Message.ClickedFormSubmit()),
        Command.resolve(SubmitForm, Message.FailedSubmitForm()),
        model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      ),
    )
  })
})
