import { Calendar } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import {
  PersonalInfo,
  PersonalInfoLive,
  ValidateEmailAsync,
} from './personalInfo'

const args = { today: Calendar.make(2026, 4, 16) }

describe('personalInfo', () => {
  it.effect('a valid first name is stored as Valid', () =>
    story(
      PersonalInfoLive,
      args,
      message(PersonalInfo.Message.UpdatedFirstName({ value: 'Jane' })),
      model(model => {
        expect(model.firstName.value).toBe('Jane')
        expect(model.firstName._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('a short first name is Invalid', () =>
    story(
      PersonalInfoLive,
      args,
      message(PersonalInfo.Message.UpdatedFirstName({ value: 'J' })),
      model(model => {
        expect(model.firstName._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('a well-formed email starts async uniqueness validation', () =>
    story(
      PersonalInfoLive,
      args,
      message(PersonalInfo.Message.UpdatedEmail({ value: 'jane@example.com' })),
      Command.expectHas(ValidateEmailAsync),
      Command.resolve(
        ValidateEmailAsync,
        PersonalInfo.Message.CompletedValidateEmailAsync({
          validationId: 1,
          field: Valid({ value: 'jane@example.com' }),
        }),
      ),
      model(model => {
        expect(model.email._tag).toBe('Valid')
      }),
    ),
  )

  it.effect(
    'a malformed email fails sync validation without an async command',
    () =>
      story(
        PersonalInfoLive,
        args,
        message(PersonalInfo.Message.UpdatedEmail({ value: 'not-email' })),
        Command.expectNone(),
        model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      ),
  )

  it.effect('a stale email async result is discarded', () =>
    story(
      PersonalInfoLive,
      args,
      message(PersonalInfo.Message.UpdatedEmail({ value: 'old@example.com' })),
      message(PersonalInfo.Message.UpdatedEmail({ value: 'jane@example.com' })),
      Command.resolve(
        ValidateEmailAsync({ emailInput: 'old@example.com', validationId: 1 }),
        PersonalInfo.Message.CompletedValidateEmailAsync({
          validationId: 1,
          field: Valid({ value: 'old@example.com' }),
        }),
      ),
      model(model => {
        expect(model.email._tag).toBe('Validating')
        expect(model.email.value).toBe('jane@example.com')
        expect(model.emailValidationId).toBe(2)
      }),
      Command.resolve(
        ValidateEmailAsync({ emailInput: 'jane@example.com', validationId: 2 }),
        PersonalInfo.Message.CompletedValidateEmailAsync({
          validationId: 2,
          field: Valid({ value: 'jane@example.com' }),
        }),
      ),
    ),
  )
})
