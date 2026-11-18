import { Array, Effect, Match, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

class EmailTaken extends Schema.TaggedError<EmailTaken>()('EmailTaken', {
  email: Schema.String,
}) {}

class InviteExpired extends Schema.TaggedError<InviteExpired>()(
  'InviteExpired',
  {},
) {}

class Unavailable extends Schema.TaggedError<Unavailable>()(
  'Unavailable',
  {},
) {}

const SignupError = Schema.Union([EmailTaken, InviteExpired, Unavailable])
type SignupError = typeof SignupError.Type

const makeSignup = (error: SignupError) =>
  Form.define({
    name: 'Signup',
    fields: {
      email: Form.field({
        schema: Schema.String,
        initial: 'ada@example.com',
        validateOn: 'Blur',
        rules: FieldValidation.makeRules({ required: 'Enter an email' }),
      }),
      invite: Form.field({
        schema: Schema.String,
        initial: 'INVITE-1',
      }),
    },
    submit: {
      error: SignupError,
      execute: () => Effect.fail(error),
      toFieldErrors: error =>
        Match.value(error).pipe(
          Match.tagsExhaustive({
            EmailTaken: ({ email }) => ({
              email: `${email} is already registered`,
            }),
            InviteExpired: () => ({ invite: 'This invite has expired' }),
            Unavailable: () => ({}),
          }),
        ),
    },
  })

const submitAndReject = (error: SignupError) => {
  const signup = makeSignup(error)
  const submit = signup.submit(signup.init())
  const maybeCommand = Array.head(submit.commands ?? [])
  if (Option.isNone(maybeCommand)) {
    throw new Error('Expected the Submit Command')
  }

  const rejection = signup.update(
    submit.model,
    Effect.runSync(maybeCommand.value.effect),
  )

  return { signup, model: rejection.model }
}

describe('submission errors mapped to fields', () => {
  it('shows a mapped error on its field and keeps the typed error', () => {
    const error = new EmailTaken({ email: 'ada@example.com' })
    const { signup, model } = submitAndReject(error)

    expect(signup.field(model, 'email').errors).toEqual([
      'ada@example.com is already registered',
    ])
    expect(signup.field(model, 'invite').errors).toEqual([])
    expect(signup.submission(model)).toEqual(
      signup.Submission.Failed({ error }),
    )
  })

  it('reports the typed error to the parent whether or not it maps to a field', () => {
    const signup = makeSignup(new EmailTaken({ email: 'ada@example.com' }))
    const submit = signup.submit(signup.init())
    const rejection = signup.update(
      submit.model,
      Effect.runSync(
        Array.head(submit.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )

    expect(rejection.outMessage).toEqual(
      signup.OutMessage.FailedSubmit({
        error: new EmailTaken({ email: 'ada@example.com' }),
      }),
    )
  })

  it('keeps an unmapped error at the form level only', () => {
    const error = new Unavailable({})
    const { signup, model } = submitAndReject(error)

    expect(signup.field(model, 'email').errors).toEqual([])
    expect(signup.field(model, 'invite').errors).toEqual([])
    expect(signup.submission(model)).toEqual(
      signup.Submission.Failed({ error }),
    )
  })

  it('clears a mapped error when the field changes', () => {
    const { signup, model } = submitAndReject(new InviteExpired({}))
    expect(signup.field(model, 'invite').errors).toEqual([
      'This invite has expired',
    ])

    const change = signup.update(model, signup.changed('invite', 'INVITE-2'))

    expect(signup.field(change.model, 'invite').errors).toEqual([])
  })

  it('keeps a mapped error when the field blurs without a change', () => {
    const { signup, model } = submitAndReject(
      new EmailTaken({ email: 'ada@example.com' }),
    )
    const blur = signup.update(model, signup.blurred('email'))

    expect(signup.field(blur.model, 'email').errors).toEqual([
      'ada@example.com is already registered',
    ])
  })

  it('checks a mapped field again and sends it on the next submit', () => {
    const { signup, model } = submitAndReject(
      new EmailTaken({ email: 'ada@example.com' }),
    )
    expect(signup.field(model, 'email').errors).toHaveLength(1)

    const resubmit = signup.submit(model)

    expect(signup.field(resubmit.model, 'email').errors).toEqual([])
    expect(signup.submission(resubmit.model)._tag).toBe('Submitting')
  })

  it('leaves a field that changed while the submission was pending', () => {
    const signup = makeSignup(new InviteExpired({}))
    const submit = signup.submit(signup.init())
    const change = signup.update(
      submit.model,
      signup.changed('invite', 'INVITE-2'),
    )
    const rejection = signup.update(
      change.model,
      Effect.runSync(
        Array.head(submit.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )

    expect(signup.field(rejection.model, 'invite').errors).toEqual([])
    expect(signup.submission(rejection.model)._tag).toBe('Failed')
  })

  it('maps an error to a field that changed back to the sent value', () => {
    const signup = makeSignup(new InviteExpired({}))
    const submit = signup.submit(signup.init())
    const change = signup.update(
      submit.model,
      signup.changed('invite', 'INVITE-2'),
    )
    const revert = signup.update(
      change.model,
      signup.changed('invite', 'INVITE-1'),
    )
    const rejection = signup.update(
      revert.model,
      Effect.runSync(
        Array.head(submit.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )

    expect(signup.field(rejection.model, 'invite').errors).toEqual([
      'This invite has expired',
    ])
  })

  it('compares a typed field by the input it sent, not its decoded value', () => {
    const quantity = Form.define({
      name: 'Quantity',
      fields: {
        count: Form.field({ schema: Schema.FiniteFromString, initial: '42' }),
      },
      submit: {
        error: Schema.String,
        execute: () => Effect.fail('Too many'),
        toFieldErrors: message => ({ count: message }),
      },
    })
    const submit = quantity.submit(quantity.init())
    const completion = Effect.runSync(
      Array.head(submit.commands ?? []).pipe(Option.getOrThrow).effect,
    )
    const unchanged = quantity.update(submit.model, completion)
    const change = quantity.update(
      submit.model,
      quantity.changed('count', '042'),
    )
    const changed = quantity.update(change.model, completion)

    expect(quantity.field(unchanged.model, 'count').errors).toEqual([
      'Too many',
    ])
    expect(quantity.field(changed.model, 'count').errors).toEqual([])
  })

  it('keeps an asynchronous check that started while the submission was pending', () => {
    const checkedInvite = Form.define({
      name: 'CheckedInvite',
      fields: {
        invite: Form.field({
          schema: Schema.String,
          initial: 'INVITE-1',
          validate: invite =>
            Effect.succeed(invite === 'INVITE-2' ? ['Unknown invite'] : []),
        }),
      },
      submit: {
        error: SignupError,
        execute: () => Effect.fail(new InviteExpired({})),
        toFieldErrors: () => ({ invite: 'This invite has expired' }),
      },
    })
    const validation = checkedInvite.submit(checkedInvite.init())
    const submit = checkedInvite.update(
      validation.model,
      Effect.runSync(
        Array.head(validation.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )
    const change = checkedInvite.update(
      submit.model,
      checkedInvite.changed('invite', 'INVITE-2'),
    )
    const rejection = checkedInvite.update(
      change.model,
      Effect.runSync(
        Array.head(submit.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )
    const check = checkedInvite.update(
      rejection.model,
      Effect.runSync(
        Array.head(change.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )

    expect(checkedInvite.field(check.model, 'invite').errors).toEqual([
      'Unknown invite',
    ])
  })

  it('encodes and decodes a Model while its submission is pending', () => {
    const signup = makeSignup(new InviteExpired({}))
    const submit = signup.submit(signup.init())
    const codec = Schema.toCodecJson(signup.Model)

    expect(signup.submission(submit.model)._tag).toBe('Submitting')
    expect(
      Schema.decodeSync(codec)(Schema.encodeSync(codec)(submit.model)),
    ).toEqual(submit.model)
  })

  it('encodes and decodes a Model that holds a mapped error', () => {
    const { signup, model } = submitAndReject(new InviteExpired({}))
    const codec = Schema.toCodecJson(signup.Model)

    expect(Schema.decodeSync(codec)(Schema.encodeSync(codec)(model))).toEqual(
      model,
    )
  })

  it('reads messages only for field names the mapping returns', () => {
    const special = Form.define({
      name: 'SpecialRejection',
      fields: {
        constructor: Form.field({ schema: Schema.String, initial: '' }),
        toString: Form.field({ schema: Schema.String, initial: '' }),
      },
      submit: {
        error: Schema.String,
        execute: () => Effect.fail('Unavailable'),
        toFieldErrors: () => ({}),
      },
    })
    const submit = special.submit(special.init())
    const rejection = special.update(
      submit.model,
      Effect.runSync(
        Array.head(submit.commands ?? []).pipe(Option.getOrThrow).effect,
      ),
    )

    expect(special.field(rejection.model, 'constructor').errors).toEqual([])
    expect(special.field(rejection.model, 'toString').errors).toEqual([])
    expect(special.submission(rejection.model)).toEqual(
      special.Submission.Failed({ error: 'Unavailable' }),
    )
  })
})
