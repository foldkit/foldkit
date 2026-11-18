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

class SignupUnavailable extends Schema.TaggedError<SignupUnavailable>()(
  'SignupUnavailable',
  {},
) {}

const SignupError = Schema.Union([EmailTaken, InviteExpired, SignupUnavailable])
type SignupError = typeof SignupError.Type

const signupForm = Form.define({
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
          SignupUnavailable: () => ({}),
        }),
      ),
  },
})

const completedSubmitFailure = (error: SignupError) =>
  signupForm.Message.CompletedSubmit({
    generation: 1,
    result: Result.fail(error),
  })

const submitAndReject = (error: SignupError) =>
  signupForm.update(
    signupForm.submit(signupForm.init()).model,
    completedSubmitFailure(error),
  )

describe('submission errors mapped to fields', () => {
  it('shows a mapped error on its field and keeps the typed error', () => {
    const error = new EmailTaken({ email: 'ada@example.com' })
    const rejection = submitAndReject(error)

    expect(signupForm.fieldView(rejection.model, 'email').errors).toEqual([
      'ada@example.com is already registered',
    ])
    expect(signupForm.submission(rejection.model)).toEqual(
      signupForm.Submission.Failed({ error }),
    )
    expect(rejection.outMessage).toEqual(
      signupForm.OutMessage.FailedSubmit({ error }),
    )
  })

  it('keeps an unmapped error at the form level only', () => {
    const error = new SignupUnavailable({})
    const rejection = submitAndReject(error)

    expect(signupForm.fieldView(rejection.model, 'email').errors).toEqual([])
    expect(signupForm.fieldView(rejection.model, 'invite').errors).toEqual([])
    expect(signupForm.submission(rejection.model)).toEqual(
      signupForm.Submission.Failed({ error }),
    )
    expect(rejection.outMessage).toEqual(
      signupForm.OutMessage.FailedSubmit({ error }),
    )
  })

  it('clears a mapped error when the field changes', () => {
    const rejection = submitAndReject(new InviteExpired({}))
    const change = signupForm.update(
      rejection.model,
      signupForm.changed('invite', 'INVITE-2'),
    )

    expect(signupForm.fieldView(change.model, 'invite').errors).toEqual([])
  })

  it('keeps a mapped error when the field blurs without a change', () => {
    const rejection = submitAndReject(
      new EmailTaken({ email: 'ada@example.com' }),
    )
    const blur = signupForm.update(rejection.model, signupForm.blurred('email'))

    expect(signupForm.fieldView(blur.model, 'email').errors).toEqual([
      'ada@example.com is already registered',
    ])
  })

  it('checks a mapped field again on the next submit', () => {
    const rejection = submitAndReject(
      new EmailTaken({ email: 'ada@example.com' }),
    )
    const resubmit = signupForm.submit(rejection.model)

    expect(signupForm.fieldView(resubmit.model, 'email').errors).toEqual([])
    expect(signupForm.submission(resubmit.model)._tag).toBe('Submitting')
  })

  it('leaves a field alone when its input changed while the submission was pending', () => {
    const attempt = signupForm.submit(signupForm.init())
    const change = signupForm.update(
      attempt.model,
      signupForm.changed('invite', 'INVITE-2'),
    )
    const rejection = signupForm.update(
      change.model,
      completedSubmitFailure(new InviteExpired({})),
    )

    expect(signupForm.fieldView(rejection.model, 'invite').errors).toEqual([])
  })

  it('maps an error to a field whose input changed back to what was sent', () => {
    const attempt = signupForm.submit(signupForm.init())
    const inviteChange = signupForm.update(
      attempt.model,
      signupForm.changed('invite', 'INVITE-2'),
    )
    const inviteRevert = signupForm.update(
      inviteChange.model,
      signupForm.changed('invite', 'INVITE-1'),
    )
    const rejection = signupForm.update(
      inviteRevert.model,
      completedSubmitFailure(new InviteExpired({})),
    )

    expect(signupForm.fieldView(rejection.model, 'invite').errors).toEqual([
      'This invite has expired',
    ])
  })

  it('compares a typed field by its sent input, not its decoded value', () => {
    const quantityForm = Form.define({
      name: 'Quantity',
      fields: {
        count: Form.field({ schema: Schema.FiniteFromString, initial: '42' }),
      },
      submit: {
        error: Schema.String,
        execute: () => Effect.void,
        toFieldErrors: error => ({ count: error }),
      },
    })
    const attempt = quantityForm.submit(quantityForm.init())
    const change = quantityForm.update(
      attempt.model,
      quantityForm.changed('count', '042'),
    )
    const rejection = quantityForm.update(
      change.model,
      quantityForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Too many'),
      }),
    )

    expect(quantityForm.fieldView(rejection.model, 'count').errors).toEqual([])
  })

  it('ignores a field whose mapped message is undefined', () => {
    const contactForm = Form.define({
      name: 'Contact',
      fields: { email: Form.field({ schema: Schema.String, initial: 'a' }) },
      submit: {
        error: Schema.String,
        execute: () => Effect.void,
        toFieldErrors: () => ({ email: undefined }),
      },
    })
    const rejection = contactForm.update(
      contactForm.submit(contactForm.init()).model,
      contactForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Unavailable'),
      }),
    )

    expect(contactForm.fieldView(rejection.model, 'email').errors).toEqual([])
  })

  it('uses only the messages the mapping returns, not inherited properties', () => {
    const specialForm = Form.define({
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
    const rejection = specialForm.update(
      specialForm.submit(specialForm.init()).model,
      specialForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Unavailable'),
      }),
    )

    expect(
      specialForm.fieldView(rejection.model, 'constructor').errors,
    ).toEqual([])
    expect(specialForm.fieldView(rejection.model, 'toString').errors).toEqual(
      [],
    )
  })
})
