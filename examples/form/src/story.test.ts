import { FieldValidation, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { SubmitForm, ValidateEmail } from './command'
import { ApplicationBlock, layer } from './index'
import { initialModel } from './init'
import { Message } from './message'
import type { Model } from './model'

const validModel: Model = modifyFields(initialModel, {
  name: () => FieldValidation.Valid({ value: 'Alice' }),
  email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
})

describe('update', () => {
  describe('name field', () => {
    it.effect('typing a long name produces a Valid field', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.UpdatedName({ value: 'Alice' })),
        Story.model(model => {
          expect(model.name._tag).toBe('Valid')
          expect(model.name.value).toBe('Alice')
        }),
      ),
    )

    it.effect(
      'typing a short name produces an Invalid field with the min-length error',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          Story.message(Message.UpdatedName({ value: 'A' })),
          Story.model(model => {
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
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          Story.message(Message.UpdatedEmail({ value: 'alice@example.com' })),
          Story.model(model => {
            expect(model.email._tag).toBe('Validating')
          }),
          Story.Command.expectHas(ValidateEmail),
          Story.Command.resolve(
            ValidateEmail,
            Message.CompletedValidateEmail({
              field: FieldValidation.Valid({ value: 'alice@example.com' }),
            }),
          ),
          Story.model(model => {
            expect(model.email._tag).toBe('Valid')
          }),
        ),
    )

    it.effect(
      'typing a malformed email produces Invalid without an async command',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          Story.message(Message.UpdatedEmail({ value: 'not-an-email' })),
          Story.Command.expectNone(),
          Story.model(model => {
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

        return Story.story(
          { block: ApplicationBlock, layer },
          Story.given(inFlightModel),
          Story.message(
            Message.CompletedValidateEmail({
              field: FieldValidation.Valid({ value: 'old@example.com' }),
            }),
          ),
          Story.model(model => {
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

        return Story.story(
          { block: ApplicationBlock, layer },
          Story.given(inFlightModel),
          Story.message(
            Message.CompletedValidateEmail({
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
      },
    )
  })

  describe('message text field', () => {
    it.effect('UpdatedMessageText stores the value as Valid', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.UpdatedMessageText({ value: 'Hello there.' })),
        Story.model(model => {
          expect(model.messageText._tag).toBe('Valid')
          expect(model.messageText.value).toBe('Hello there.')
        }),
      ),
    )
  })

  describe('submission', () => {
    it.effect('ClickedFormSubmit on an invalid form is ignored', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedFormSubmit()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
        }),
      ),
    )

    it.effect(
      'ClickedFormSubmit on a valid form fires SubmitForm and enters Submitting',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(validModel),
          Story.message(Message.ClickedFormSubmit()),
          Story.model(model => {
            expect(model.submission._tag).toBe('Submitting')
          }),
          Story.Command.expectHas(SubmitForm),
          Story.Command.resolve(
            SubmitForm,
            Message.SucceededSubmitForm({ name: 'Alice' }),
          ),
          Story.model(model => {
            expect(model.submission._tag).toBe('SubmitSuccess')
            if (model.submission._tag === 'SubmitSuccess') {
              expect(model.submission.confirmationText).toContain('Alice')
            }
          }),
        ),
    )

    it.effect('FailedSubmitForm sets SubmitError', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(validModel),
        Story.message(Message.ClickedFormSubmit()),
        Story.Command.resolve(SubmitForm, Message.FailedSubmitForm()),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      ),
    )
  })
})
