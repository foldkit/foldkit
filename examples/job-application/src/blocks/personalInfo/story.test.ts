import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import { inMessage, init, withBlock } from 'foldkit/story'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { PersonalInfoBlock, layer } from './block'
import { ValidateEmailAsync } from './command'
import { InMessage, Message } from './definition'

const today = Calendar.make(2026, 4, 16)
const givenInitial = init(today)

describe('personalInfo', () => {
  it.effect(
    'a parent request reveals validation errors without starting email validation',
    () =>
      story(
        PersonalInfoBlock,
        givenInitial,
        inMessage(InMessage.RequestedRevealErrors()),
        Command.expectNone(),
        model(model => {
          expect(model.firstName._tag).toBe('Invalid')
          expect(model.lastName._tag).toBe('Invalid')
          expect(model.email._tag).toBe('Invalid')
          expect(model.phone._tag).toBe('NotValidated')
          expect(model.portfolioUrl._tag).toBe('NotValidated')
        }),
      ).pipe(Effect.provide(layer)),
  )

  it.effect('a valid first name is stored as Valid', () =>
    story(
      PersonalInfoBlock,
      givenInitial,
      message(Message.UpdatedFirstName({ value: 'Jane' })),
      model(model => {
        expect(model.firstName.value).toBe('Jane')
        expect(model.firstName._tag).toBe('Valid')
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('a short first name is Invalid', () =>
    story(
      PersonalInfoBlock,
      givenInitial,
      message(Message.UpdatedFirstName({ value: 'J' })),
      model(model => {
        expect(model.firstName._tag).toBe('Invalid')
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('a well-formed email starts async uniqueness validation', () =>
    story(
      PersonalInfoBlock,
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
    ).pipe(Effect.provide(layer)),
  )

  it.effect(
    'a malformed email fails sync validation without an async command',
    () =>
      story(
        PersonalInfoBlock,
        givenInitial,
        message(Message.UpdatedEmail({ value: 'not-email' })),
        Command.expectNone(),
        model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      ).pipe(Effect.provide(layer)),
  )

  it.effect('a stale email async result is discarded', () =>
    Effect.gen(function* () {
      const initialModel = yield* withBlock(
        PersonalInfoBlock,
        personalInfo => personalInfo.init(today).model,
      ).pipe(Effect.provide(layer))

      yield* story(
        PersonalInfoBlock,
        given(
          modifyFields(initialModel, {
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
      ).pipe(Effect.provide(layer))
    }),
  )
})
