import { Array, Context, Effect, Option, Schema } from 'effect'
import { expect, expectTypeOf, it, vi } from 'vitest'

import * as Form from './index.js'

class CheckUsername extends Context.Service<
  CheckUsername,
  { check: (value: string) => ReadonlyArray<string> }
>()('CheckUsername') {}

class CheckAge extends Context.Service<
  CheckAge,
  { check: (value: number) => ReadonlyArray<string> }
>()('CheckAge') {}

const text = Form.field({ schema: Schema.String, initial: { value: '' } })
const username = Form.field({
  schema: Schema.String,
  initial: { value: '' },
  validate: value => Effect.map(CheckUsername, service => service.check(value)),
})
const age = Form.field({
  schema: Schema.NumberFromString,
  initial: { value: 18 },
  validate: value => Effect.map(CheckAge, service => service.check(value)),
})

it('exposes the supplied validator and omits absent validators', () => {
  const validate = (value: string) => Effect.succeed(value ? [] : ['Required'])
  const checked = Form.field({
    schema: Schema.String,
    initial: { value: '' },
    validate,
  })
  const unchecked = Form.field({
    schema: Schema.String,
    initial: { value: '' },
    validate: undefined,
  })

  expect(checked.validator).toBe(validate)
  expect(Object.hasOwn(text, 'validator')).toBe(false)
  expect(Object.hasOwn(unchecked, 'validator')).toBe(false)
})

it('retains service requirements across mixed fields', () => {
  const registration = Form.define({
    name: 'ServicefulRegistration',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { text, username, age },
  })
  const change = registration.update(
    registration.init(),
    registration.changed('username', { value: 'taken' }),
  )
  const maybeCommand = Array.head(change.commands ?? [])
  if (Option.isNone(maybeCommand)) {
    throw new Error('Expected a validation Command')
  }

  expectTypeOf<
    Effect.Services<typeof maybeCommand.value.effect>
  >().toEqualTypeOf<CheckUsername | CheckAge>()
  const checkUsername = vi.fn((_value: string) => ['Taken'])
  const checkAge = vi.fn((_value: number) => ['Age unavailable'])
  const completed = registration.update(
    change.model,
    Effect.runSync(
      maybeCommand.value.effect.pipe(
        Effect.provideService(CheckUsername, { check: checkUsername }),
        Effect.provideService(CheckAge, { check: checkAge }),
      ),
    ),
  )

  expect(checkUsername).toHaveBeenCalledExactlyOnceWith('taken')
  expect(checkAge).not.toHaveBeenCalled()
  expect(registration.field(completed.model, 'username').errors).toEqual([
    'Taken',
  ])

  const ageChange = registration.update(
    completed.model,
    registration.changed('age', { value: 21 }),
  )
  const validateAge = Option.getOrThrow(Array.head(ageChange.commands ?? []))
  const ageCompleted = registration.update(
    ageChange.model,
    Effect.runSync(
      validateAge.effect.pipe(
        Effect.provideService(CheckUsername, { check: checkUsername }),
        Effect.provideService(CheckAge, { check: checkAge }),
      ),
    ),
  )

  expect(checkAge).toHaveBeenCalledExactlyOnceWith(21)
  expect(checkUsername).toHaveBeenCalledTimes(1)
  expect(registration.field(ageCompleted.model, 'age').errors).toEqual([
    'Age unavailable',
  ])
  expect(registration.field(ageCompleted.model, 'username').errors).toEqual([
    'Taken',
  ])
})

it('invokes the validator only when its Command executes and reports typed failures', () => {
  const validate = vi.fn((_value: string) => Effect.fail('Unavailable'))
  const form = Form.define({
    name: 'DeferredValidator',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      username: Form.field({
        schema: Schema.String,
        initial: { value: '' },
        validate,
      }),
    },
  })
  const change = form.update(
    form.init(),
    form.changed('username', { value: 'next' }),
  )

  expect(validate).not.toHaveBeenCalled()

  const maybeCommand = Array.head(change.commands ?? [])
  if (Option.isNone(maybeCommand)) {
    throw new Error('Expected a validation Command')
  }

  const completed = form.update(
    change.model,
    Effect.runSync(maybeCommand.value.effect),
  )

  expect(validate).toHaveBeenCalledWith('next')
  expect(form.field(completed.model, 'username').errors).toEqual([
    'Unavailable',
  ])
})
