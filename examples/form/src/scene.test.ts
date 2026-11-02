import { FieldValidation } from 'foldkit'
import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  submit,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import {
  ApplicationLive,
  Message,
  SubmitForm,
  ValidateEmail,
  initialModel,
} from './application'

describe('view', () => {
  it.effect('initial view shows all fields and a disabled submit button', () =>
    scene(
      ApplicationLive,
      expect(role('heading', { name: 'Join Our Waitlist' })).toExist(),
      expect(label('Name')).toExist(),
      expect(label('Email')).toExist(),
      expect(label("Anything you'd like to share with us?")).toExist(),
      expect(role('button', { name: 'Join Waitlist' })).toBeDisabled(),
    ),
  )

  it.effect(
    'typing a short name shows a validation error via accessible description',
    () =>
      scene(
        ApplicationLive,
        type(label('Name'), 'A'),
        expect(label('Name')).toHaveAccessibleDescription(
          'Name must be at least 2 characters',
        ),
      ),
  )

  it.effect(
    'typing a malformed email surfaces a synchronous validation error',
    () =>
      scene(
        ApplicationLive,
        type(label('Email'), 'not-an-email'),
        expect(label('Email')).toHaveAccessibleDescription(
          'Please enter a valid email address',
        ),
      ),
  )

  it.effect('typing a well-formed email triggers async validation', () => {
    const modelWithValidName = modifyFields(initialModel, {
      name: () => FieldValidation.Valid({ value: 'Alice' }),
    })

    return scene(
      ApplicationLive,
      given(modelWithValidName),
      type(label('Email'), 'alice@example.com'),
      expect(label('Email')).toHaveAccessibleDescription('Checking...'),
      expect(role('button', { name: 'Join Waitlist' })).toBeDisabled(),
      Command.expectExact(ValidateEmail),
      Command.resolve(
        ValidateEmail,
        Message.CompletedValidateEmail({
          field: FieldValidation.Valid({ value: 'alice@example.com' }),
        }),
      ),
      expect(role('button', { name: 'Join Waitlist' })).toBeEnabled(),
    )
  })

  it.effect('async validation can flag an email as taken', () =>
    scene(
      ApplicationLive,
      type(label('Email'), 'test@example.com'),
      Command.expectExact(ValidateEmail),
      Command.resolve(
        ValidateEmail,
        Message.CompletedValidateEmail({
          field: FieldValidation.Invalid({
            value: 'test@example.com',
            errors: ['This email is already on our waitlist'],
          }),
        }),
      ),
      expect(label('Email')).toHaveAccessibleDescription(
        'This email is already on our waitlist',
      ),
    ),
  )

  it.effect('submit becomes enabled once name and email are valid', () => {
    const validModel = modifyFields(initialModel, {
      name: () => FieldValidation.Valid({ value: 'Alice' }),
      email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
    })

    return scene(
      ApplicationLive,
      given(validModel),
      expect(role('button', { name: 'Join Waitlist' })).toBeEnabled(),
    )
  })

  it.effect(
    'submitting a valid form shows the loading label then a success banner',
    () => {
      const validModel = modifyFields(initialModel, {
        name: () => FieldValidation.Valid({ value: 'Alice' }),
        email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
      })

      return scene(
        ApplicationLive,
        given(validModel),
        click(role('button', { name: 'Join Waitlist' })),
        expect(role('button', { name: 'Joining...' })).toBeDisabled(),
        Command.expectExact(SubmitForm),
        Command.resolve(
          SubmitForm,
          Message.SucceededSubmitForm({ name: 'Alice' }),
        ),
        expect(role('status')).toContainText('Welcome to the waitlist, Alice!'),
        expect(role('button', { name: 'Join Waitlist' })).toExist(),
      )
    },
  )

  it.effect('a failed submission renders an error banner', () => {
    const validModel = modifyFields(initialModel, {
      name: () => FieldValidation.Valid({ value: 'Alice' }),
      email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
    })

    return scene(
      ApplicationLive,
      given(validModel),
      submit(role('form')),
      Command.expectExact(SubmitForm),
      Command.resolve(SubmitForm, Message.FailedSubmitForm()),
      expect(role('alert')).toContainText('Sorry, there was an error'),
    )
  })

  it.effect(
    'submitting an invalid form (e.g. via Enter key) is rejected by update',
    () =>
      scene(
        ApplicationLive,
        expect(role('button', { name: 'Join Waitlist' })).toBeDisabled(),
        submit(role('form')),
        expect(role('button', { name: 'Join Waitlist' })).toBeDisabled(),
      ),
  )
})
