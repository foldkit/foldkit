import { Effect, Match, Result, Schema } from 'effect'
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

const signup = Form.define({
  name: 'Signup',
  fields: {
    email: Form.field({
      schema: Schema.String,
      initial: 'ada@example.com',
      validateOn: 'Blur',
      rules: FieldValidation.makeRules({ required: 'Enter an email' }),
    }),
    invite: Form.field({ schema: Schema.String, initial: 'INVITE-1' }),
  },
  submit: {
    error: SignupError,
    execute: () => Effect.void,
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

const rejected = (error: SignupError) =>
  signup.Message.CompletedSubmit({ generation: 1, result: Result.fail(error) })

const submitAndReject = (error: SignupError) =>
  signup.update(signup.submit(signup.init()).model, rejected(error))

describe('submission errors mapped to fields', () => {
  it('shows a mapped error on its field and keeps the typed error', () => {
    const error = new EmailTaken({ email: 'ada@example.com' })
    const rejection = submitAndReject(error)

    expect(signup.fieldView(rejection.model, 'email').errors).toEqual([
      'ada@example.com is already registered',
    ])
    expect(signup.submission(rejection.model)).toEqual(
      signup.Submission.Failed({ error }),
    )
  })

  it('keeps an unmapped error at the form level only', () => {
    const rejection = submitAndReject(new Unavailable({}))

    expect(signup.fieldView(rejection.model, 'email').errors).toEqual([])
    expect(signup.fieldView(rejection.model, 'invite').errors).toEqual([])
  })

  it.each([new EmailTaken({ email: 'ada@example.com' }), new Unavailable({})])(
    'reports $_tag to the parent whether or not it maps to a field',
    error => {
      expect(submitAndReject(error).outMessage).toEqual(
        signup.OutMessage.FailedSubmit({ error }),
      )
    },
  )

  it('clears a mapped error when the field changes', () => {
    const rejection = submitAndReject(new InviteExpired({}))
    const change = signup.update(
      rejection.model,
      signup.changed('invite', 'INVITE-2'),
    )

    expect(signup.fieldView(change.model, 'invite').errors).toEqual([])
  })

  it('keeps a mapped error when the field blurs without a change', () => {
    const rejection = submitAndReject(
      new EmailTaken({ email: 'ada@example.com' }),
    )
    const blur = signup.update(rejection.model, signup.blurred('email'))

    expect(signup.fieldView(blur.model, 'email').errors).toEqual([
      'ada@example.com is already registered',
    ])
  })

  it('checks a mapped field again on the next submit', () => {
    const rejection = submitAndReject(
      new EmailTaken({ email: 'ada@example.com' }),
    )
    const resubmit = signup.submit(rejection.model)

    expect(signup.fieldView(resubmit.model, 'email').errors).toEqual([])
    expect(signup.submission(resubmit.model)._tag).toBe('Submitting')
  })

  it('leaves a field whose input changed while the submission was pending', () => {
    const attempt = signup.submit(signup.init())
    const change = signup.update(
      attempt.model,
      signup.changed('invite', 'INVITE-2'),
    )
    const rejection = signup.update(
      change.model,
      rejected(new InviteExpired({})),
    )

    expect(signup.fieldView(rejection.model, 'invite').errors).toEqual([])
  })

  it('maps an error to a field whose input changed back to the sent input', () => {
    const attempt = signup.submit(signup.init())
    const away = signup.update(
      attempt.model,
      signup.changed('invite', 'INVITE-2'),
    )
    const back = signup.update(away.model, signup.changed('invite', 'INVITE-1'))
    const rejection = signup.update(back.model, rejected(new InviteExpired({})))

    expect(signup.fieldView(rejection.model, 'invite').errors).toEqual([
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
        execute: () => Effect.void,
        toFieldErrors: message => ({ count: message }),
      },
    })
    const attempt = quantity.submit(quantity.init())
    const change = quantity.update(
      attempt.model,
      quantity.changed('count', '042'),
    )
    const rejection = quantity.update(
      change.model,
      quantity.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Too many'),
      }),
    )

    expect(quantity.fieldView(rejection.model, 'count').errors).toEqual([])
  })

  it('keeps an asynchronous check that started while the submission was pending', () => {
    const checkedInvite = Form.define({
      name: 'CheckedInvite',
      fields: {
        invite: Form.field({
          schema: Schema.String,
          initial: 'INVITE-1',
          validate: () => Effect.succeed([]),
        }),
      },
      submit: {
        error: Schema.String,
        execute: () => Effect.void,
        toFieldErrors: () => ({ invite: 'This invite has expired' }),
      },
    })
    const attempt = checkedInvite.submit(checkedInvite.init())
    const submitting = checkedInvite.update(
      attempt.model,
      checkedInvite.Message.CompletedValidateField({
        name: 'invite',
        generation: 1,
        result: Result.succeed([]),
      }),
    )
    const change = checkedInvite.update(
      submitting.model,
      checkedInvite.changed('invite', 'INVITE-2'),
    )
    const rejection = checkedInvite.update(
      change.model,
      checkedInvite.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Expired'),
      }),
    )
    const checked = checkedInvite.update(
      rejection.model,
      checkedInvite.Message.CompletedValidateField({
        name: 'invite',
        generation: 2,
        result: Result.succeed(['Unknown invite']),
      }),
    )

    expect(checkedInvite.fieldView(checked.model, 'invite').errors).toEqual([
      'Unknown invite',
    ])
  })

  it('ignores a field whose mapped message is undefined', () => {
    const contact = Form.define({
      name: 'Contact',
      fields: { email: Form.field({ schema: Schema.String, initial: 'a' }) },
      submit: {
        error: Schema.String,
        execute: () => Effect.void,
        toFieldErrors: () => ({ email: undefined }),
      },
    })
    const rejection = contact.update(
      contact.submit(contact.init()).model,
      contact.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Unavailable'),
      }),
    )

    expect(contact.fieldView(rejection.model, 'email').errors).toEqual([])
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
        execute: () => Effect.void,
        toFieldErrors: () => ({}),
      },
    })
    const rejection = special.update(
      special.submit(special.init()).model,
      special.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Unavailable'),
      }),
    )

    expect(special.fieldView(rejection.model, 'constructor').errors).toEqual([])
    expect(special.fieldView(rejection.model, 'toString').errors).toEqual([])
  })
})
