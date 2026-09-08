import { Calendar } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { Message, ValidateEmailAsync, init, update } from './personalInfo'

const today = Calendar.make(2026, 4, 16)
const givenInitial = given(init(today))

describe('personalInfo', () => {
  test('a valid first name is stored as Valid', () => {
    story(
      update,
      givenInitial,
      message(Message.UpdatedFirstName({ value: 'Jane' })),
      model(model => {
        expect(model.firstName.value).toBe('Jane')
        expect(model.firstName._tag).toBe('Valid')
      }),
    )
  })

  test('a short first name is Invalid', () => {
    story(
      update,
      givenInitial,
      message(Message.UpdatedFirstName({ value: 'J' })),
      model(model => {
        expect(model.firstName._tag).toBe('Invalid')
      }),
    )
  })

  test('a well-formed email starts async uniqueness validation', () => {
    story(
      update,
      givenInitial,
      message(Message.UpdatedEmail({ value: 'jane@example.com' })),
      Command.expectHas(ValidateEmailAsync),
      Command.resolve(
        ValidateEmailAsync,
        Message.CompletedValidateEmailAsync({
          validationId: 1,
          field: Valid({ value: 'jane@example.com' }),
        }),
      ),
      model(model => {
        expect(model.email._tag).toBe('Valid')
      }),
    )
  })

  test('a malformed email fails sync validation without an async command', () => {
    story(
      update,
      givenInitial,
      message(Message.UpdatedEmail({ value: 'not-email' })),
      Command.expectNone(),
      model(model => {
        expect(model.email._tag).toBe('Invalid')
      }),
    )
  })

  test('a stale email async result is discarded', () => {
    story(
      update,
      given(
        evo(init(today), {
          email: () => Validating({ value: 'jane@example.com' }),
          emailValidationId: () => 5,
        }),
      ),
      message(
        Message.CompletedValidateEmailAsync({
          validationId: 3,
          field: Valid({ value: 'old@example.com' }),
        }),
      ),
      model(model => {
        expect(model.email._tag).toBe('Validating')
        expect(model.email.value).toBe('jane@example.com')
        expect(model.emailValidationId).toBe(5)
      }),
    )
  })
})
