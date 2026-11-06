import { FieldValidation, Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { SubmitForm, ValidateEmail } from './command'
import { ApplicationBlock, layer } from './index'
import { initialModel } from './init'
import { Message } from './message'

describe('view', () => {
  it.effect('initial view shows all fields and a disabled submit button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
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
    ),
  )

  it.effect(
    'typing a short name shows a validation error via accessible description',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.type(Scene.label('Name'), 'A'),
        Scene.expect(Scene.label('Name')).toHaveAccessibleDescription(
          'Name must be at least 2 characters',
        ),
      ),
  )

  it.effect(
    'typing a malformed email surfaces a synchronous validation error',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.type(Scene.label('Email'), 'not-an-email'),
        Scene.expect(Scene.label('Email')).toHaveAccessibleDescription(
          'Please enter a valid email address',
        ),
      ),
  )

  it.effect('typing a well-formed email triggers async validation', () => {
    const modelWithValidName = modifyFields(initialModel, {
      name: () => FieldValidation.Valid({ value: 'Alice' }),
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithValidName),
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
        Message.CompletedValidateEmail({
          field: FieldValidation.Valid({ value: 'alice@example.com' }),
        }),
      ),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeEnabled(),
    )
  })

  it.effect('async validation can flag an email as taken', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.type(Scene.label('Email'), 'test@example.com'),
      Scene.Command.expectExact(ValidateEmail),
      Scene.Command.resolve(
        ValidateEmail,
        Message.CompletedValidateEmail({
          field: FieldValidation.Invalid({
            value: 'test@example.com',
            errors: ['This email is already on our waitlist'],
          }),
        }),
      ),
      Scene.expect(Scene.label('Email')).toHaveAccessibleDescription(
        'This email is already on our waitlist',
      ),
    ),
  )

  it.effect('submit becomes enabled once name and email are valid', () => {
    const validModel = modifyFields(initialModel, {
      name: () => FieldValidation.Valid({ value: 'Alice' }),
      email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(validModel),
      Scene.expect(
        Scene.role('button', { name: 'Join Waitlist' }),
      ).toBeEnabled(),
    )
  })

  it.effect(
    'submitting a valid form shows the loading label then a success banner',
    () => {
      const validModel = modifyFields(initialModel, {
        name: () => FieldValidation.Valid({ value: 'Alice' }),
        email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
      })

      return Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(validModel),
        Scene.click(Scene.role('button', { name: 'Join Waitlist' })),
        Scene.expect(
          Scene.role('button', { name: 'Joining...' }),
        ).toBeDisabled(),
        Scene.Command.expectExact(SubmitForm),
        Scene.Command.resolve(
          SubmitForm,
          Message.SucceededSubmitForm({ name: 'Alice' }),
        ),
        Scene.expect(Scene.role('status')).toContainText(
          'Welcome to the waitlist, Alice!',
        ),
        Scene.expect(Scene.role('button', { name: 'Join Waitlist' })).toExist(),
      )
    },
  )

  it.effect('a failed submission renders an error banner', () => {
    const validModel = modifyFields(initialModel, {
      name: () => FieldValidation.Valid({ value: 'Alice' }),
      email: () => FieldValidation.Valid({ value: 'alice@example.com' }),
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(validModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(SubmitForm),
      Scene.Command.resolve(SubmitForm, Message.FailedSubmitForm()),
      Scene.expect(Scene.role('alert')).toContainText(
        'Sorry, there was an error',
      ),
    )
  })

  it.effect(
    'submitting an invalid form (e.g. via Enter key) is rejected by update',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expect(
          Scene.role('button', { name: 'Join Waitlist' }),
        ).toBeDisabled(),
        Scene.submit(Scene.role('form')),
        Scene.expect(
          Scene.role('button', { name: 'Join Waitlist' }),
        ).toBeDisabled(),
      ),
  )
})
