import { Option, Schema } from 'effect'
import { FieldValidation, Scene } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  FailedSimulateAuthRequest,
  type Model,
  SimulateAuthRequest,
  SucceededLogin,
  SucceededSimulateAuthRequest,
  initModel,
  update,
  view,
} from './login'

const { Valid } = FieldValidation.makeField(Schema.String)

const validModel: Model = {
  ...initModel(),
  email: Valid({ value: 'alice@example.com' }),
  password: Valid({ value: 'password' }),
}

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login scene', () => {
  test('initial view renders form with sign in heading, inputs, and submit button', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(initModel()),
      Scene.expect(Scene.role('heading', { name: 'Sign In' })).toExist(),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.label('Password')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toExist(),
    )
  })

  test('typing a valid email shows checkmark', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(initModel()),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.text('✓')).toExist(),
    )
  })

  test('typing an invalid email shows error message', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(initModel()),
      Scene.type(Scene.label('Email'), 'notanemail'),
      Scene.expect(Scene.text('Please enter a valid email')).toExist(),
    )
  })

  test('submit button is enabled after typing valid email and password', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(initModel()),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'password'),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toBeEnabled(),
    )
  })

  test('submitting with valid fields shows loading state', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Signing in...' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Signing in...' }),
      ).toBeDisabled(),
      Scene.resolve(
        SimulateAuthRequest,
        SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
    )
  })

  test('failed auth shows error text', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
      ),
      Scene.expect(
        Scene.within(Scene.role('form'), Scene.text('Invalid credentials')),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toExist(),
    )
  })

  test('full successful flow produces SucceededLogin outMessage', () => {
    Scene.scene(
      { update, view: Scene.childView(view) },
      Scene.with(initModel()),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'password'),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Signing in...' })).toExist(),
      Scene.resolve(
        SimulateAuthRequest,
        SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Scene.tap(({ outMessage }) => {
        expect(outMessage).toEqual(
          Option.some(SucceededLogin({ session: aliceSession })),
        )
      }),
    )
  })
})
