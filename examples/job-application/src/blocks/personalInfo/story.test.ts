import { Effect } from 'effect'
import { Calendar, Story } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { InMessage, Message } from './block'
import { ValidateEmailAsync } from './command'
import { PersonalInfoBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)
const givenInitial = Story.init(today)

describe('personalInfo', () => {
  it.effect(
    'a parent request reveals validation errors without starting email validation',
    () =>
      Story.story(
        { block: PersonalInfoBlock, layer },
        givenInitial,
        Story.inMessage(InMessage.RequestedRevealErrors()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.firstName._tag).toBe('Invalid')
          expect(model.lastName._tag).toBe('Invalid')
          expect(model.email._tag).toBe('Invalid')
          expect(model.phone._tag).toBe('NotValidated')
          expect(model.portfolioUrl._tag).toBe('NotValidated')
        }),
      ),
  )

  it.effect('a valid first name is stored as Valid', () =>
    Story.story(
      { block: PersonalInfoBlock, layer },
      givenInitial,
      Story.message(Message.UpdatedFirstName({ value: 'Jane' })),
      Story.model(model => {
        expect(model.firstName.value).toBe('Jane')
        expect(model.firstName._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('a short first name is Invalid', () =>
    Story.story(
      { block: PersonalInfoBlock, layer },
      givenInitial,
      Story.message(Message.UpdatedFirstName({ value: 'J' })),
      Story.model(model => {
        expect(model.firstName._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('a well-formed email starts async uniqueness validation', () =>
    Story.story(
      { block: PersonalInfoBlock, layer },
      givenInitial,
      Story.message(Message.UpdatedEmail({ value: 'jane@example.com' })),
      Story.Command.expectHas(ValidateEmailAsync),
      Story.Command.resolve(
        ValidateEmailAsync,
        Message.CompletedValidateEmailAsync({
          validationId: 1,
          field: Valid({ value: 'jane@example.com' }),
        }),
      ),
      Story.model(model => {
        expect(model.email._tag).toBe('Valid')
      }),
    ),
  )

  it.effect(
    'a malformed email fails sync validation without an async command',
    () =>
      Story.story(
        { block: PersonalInfoBlock, layer },
        givenInitial,
        Story.message(Message.UpdatedEmail({ value: 'not-email' })),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      ),
  )

  it.effect('a stale email async result is discarded', () =>
    Effect.gen(function* () {
      const initialModel = yield* Story.story(
        { block: PersonalInfoBlock, layer },
        Story.init(today),
      )

      yield* Story.story(
        { block: PersonalInfoBlock, layer },
        Story.given(
          modifyFields(initialModel, {
            email: () => Validating({ value: 'jane@example.com' }),
            emailValidationId: () => 5,
          }),
        ),
        Story.message(
          Message.CompletedValidateEmailAsync({
            validationId: 3,
            field: Valid({ value: 'old@example.com' }),
          }),
        ),
        Story.model(model => {
          expect(model.email._tag).toBe('Validating')
          expect(model.email.value).toBe('jane@example.com')
          expect(model.emailValidationId).toBe(5)
        }),
      )
    }),
  )
})
