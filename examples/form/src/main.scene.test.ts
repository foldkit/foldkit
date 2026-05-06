import { FieldValidation, Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  SubmitForm,
  SubmittedForm,
  ValidateEmail,
  ValidatedEmail,
  initialModel,
  update,
  view,
} from './main'

describe('form scene', () => {
  test('initial view shows all fields and a disabled submit button', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.role('heading', { name: 'Join Our Waitlist' }),
      ).toExist(),
      Scene.expect(Scene.label('Name')).toExist(),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(
        Scene.label("Anything you'd like to share with us?"),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeDisabled(),
    )
  })

  test('typing a short name shows a validation error via accessible description', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Name'), 'A'),
      Scene.expect(Scene.label('Name')).toHaveAccessibleDescription(
        'Name must be at least 2 characters',
      ),
    )
  })

  test('typing a malformed email surfaces a synchronous validation error', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'not-an-email'),
      Scene.expect(Scene.label('Email')).toHaveAccessibleDescription(
        'Please enter a valid email address',
      ),
    )
  })

  test('typing a well-formed email triggers async validation', () => {
    const modelWithValidName = {
      ...initialModel,
      name: FieldValidation.Valid({ value: 'Alice' }),
    }

    Scene.scene(
      { update, view },
      Scene.with(modelWithValidName),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.label('Email')).toHaveAccessibleDescription(
        'Checking...',
      ),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeDisabled(),
      Scene.Command.expectExact(ValidateEmail),
      Scene.Command.resolve(
        ValidateEmail,
        ValidatedEmail({
          validationId: 1,
          field: FieldValidation.Valid({ value: 'alice@example.com' }),
        }),
      ),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeEnabled(),
    )
  })

  test('async validation can flag an email as taken', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'test@example.com'),
      Scene.Command.expectExact(ValidateEmail),
      Scene.Command.resolve(
        ValidateEmail,
        ValidatedEmail({
          validationId: 1,
          field: FieldValidation.Invalid({
            value: 'test@example.com',
            errors: ['This email is already on our waitlist'],
          }),
        }),
      ),
      Scene.expect(Scene.label('Email')).toHaveAccessibleDescription(
        'This email is already on our waitlist',
      ),
    )
  })

  test('submit becomes enabled once name and email are valid', () => {
    const validModel = {
      ...initialModel,
      name: FieldValidation.Valid({ value: 'Alice' }),
      email: FieldValidation.Valid({ value: 'alice@example.com' }),
    }

    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeEnabled(),
    )
  })

  test('submitting a valid form shows the loading label then a success banner', () => {
    const validModel = {
      ...initialModel,
      name: FieldValidation.Valid({ value: 'Alice' }),
      email: FieldValidation.Valid({ value: 'alice@example.com' }),
    }

    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.click(Scene.role('button', { name: 'Join Waitlist' })),
      Scene.expect(Scene.role('button', { name: 'Joining...' })).toBeDisabled(),
      Scene.Command.expectExact(SubmitForm),
      Scene.Command.resolve(
        SubmitForm,
        SubmittedForm({
          success: true,
          name: 'Alice',
          email: 'alice@example.com',
          message: '',
        }),
      ),
      Scene.expect(Scene.role('status')).toContainText(
        'Welcome to the waitlist, Alice!',
      ),
      Scene.expect(Scene.role('button', { name: 'Join Waitlist' })).toExist(),
    )
  })

  test('a failed submission renders an error banner', () => {
    const validModel = {
      ...initialModel,
      name: FieldValidation.Valid({ value: 'Alice' }),
      email: FieldValidation.Valid({ value: 'alice@example.com' }),
    }

    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(SubmitForm),
      Scene.Command.resolve(
        SubmitForm,
        SubmittedForm({
          success: false,
          name: 'Alice',
          email: 'alice@example.com',
          message: '',
        }),
      ),
      Scene.expect(Scene.role('alert')).toContainText(
        'Sorry, there was an error',
      ),
    )
  })

  test('submitting an invalid form (e.g. via Enter key) is rejected by update', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeDisabled(),
      Scene.submit(Scene.role('form')),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeDisabled(),
    )
  })
})
