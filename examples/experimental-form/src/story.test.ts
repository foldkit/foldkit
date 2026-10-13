import { Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { Message, init, profileForm, registrationForm, update } from './main'
import {
  completedProfileValidation,
  completedRegistrationValidation,
} from './validationFixtures'

const validRegistrationModel = () => {
  const initial = init()
  const emailChange = update(
    initial.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('email', {
        value: 'person@example.com',
      }),
    }),
  )
  const nameChange = update(
    emailChange.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('name', { value: 'Person' }),
    }),
  )

  return nameChange.model
}

test('Form Command success settles the registration Form', () => {
  story(
    update,
    given(validRegistrationModel()),
    message(Message.SubmittedRegistration()),
    Command.resolve(
      registrationForm.ValidateField.email,
      completedRegistrationValidation(),
    ),
    Command.expectExact(registrationForm.Submit),
    model(model =>
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Submitting',
      ),
    ),
    Command.resolve(
      registrationForm.Submit,
      registrationForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(undefined),
      }),
    ),
    model(model =>
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Succeeded',
      ),
    ),
  )
})

test('Form Command failure exposes submission feedback', () => {
  story(
    update,
    given(validRegistrationModel()),
    message(Message.SubmittedRegistration()),
    Command.resolve(
      registrationForm.ValidateField.email,
      completedRegistrationValidation(),
    ),
    Command.resolve(
      registrationForm.Submit,
      registrationForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.fail('Email is taken'),
      }),
    ),
    model(model =>
      expect(registrationForm.submission(model.registration)).toEqual({
        _tag: 'Failed',
        error: 'Email is taken',
      }),
    ),
  )
})

test('a late completion after reset cannot settle a newer submission', () => {
  const firstSubmit = update(
    validRegistrationModel(),
    Message.SubmittedRegistration(),
  )
  const firstValidation = update(
    firstSubmit.model,
    Message.GotRegistrationMessage({
      message: completedRegistrationValidation(),
    }),
  )
  const reset = update(
    firstValidation.model,
    Message.ClickedResetRegistration(),
  )
  const emailChange = update(
    reset.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('email', { value: 'new@example.com' }),
    }),
  )
  const nameChange = update(
    emailChange.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('name', { value: 'New person' }),
    }),
  )
  const secondSubmit = update(nameChange.model, Message.SubmittedRegistration())
  const secondValidation = update(
    secondSubmit.model,
    Message.GotRegistrationMessage({
      message: completedRegistrationValidation(2),
    }),
  )

  story(
    update,
    given(secondValidation.model),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.Message.CompletedSubmit({
          token: { generation: 1 },
          result: Result.succeed(undefined),
        }),
      }),
    ),
    Command.expectNone(),
    model(model =>
      expect(registrationForm.submission(model.registration)).toEqual({
        _tag: 'Submitting',
        token: { generation: 2 },
      }),
    ),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.Message.CompletedSubmit({
          token: { generation: 2 },
          result: Result.succeed(undefined),
        }),
      }),
    ),
    model(model =>
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Succeeded',
      ),
    ),
  )
})

test.each(['Validating', 'Submitting'])(
  'a duplicate submit during %s adds no Command and does not count an attempt',
  phase => {
    const pending = update(
      validRegistrationModel(),
      Message.SubmittedRegistration(),
    )
    const validation = update(
      pending.model,
      Message.GotRegistrationMessage({
        message: completedRegistrationValidation(),
      }),
    )
    const initial = phase === 'Validating' ? pending.model : validation.model

    expect(registrationForm.submission(initial.registration)._tag).toBe(phase)

    story(
      update,
      given(initial),
      message(Message.SubmittedRegistration()),
      Command.expectNone(),
      model(model =>
        expect(registrationForm.submitCount(model.registration)).toBe(1),
      ),
    )
  },
)

test('reused field definitions leave the edit Form independent', () => {
  const registrationSubmit = update(
    validRegistrationModel(),
    Message.SubmittedRegistration(),
  )
  const registrationValidation = update(
    registrationSubmit.model,
    Message.GotRegistrationMessage({
      message: completedRegistrationValidation(),
    }),
  )
  const profileSubmit = update(
    registrationValidation.model,
    Message.SubmittedProfile(),
  )
  const profileValidation = update(
    profileSubmit.model,
    Message.GotProfileMessage({
      message: completedProfileValidation(),
    }),
  )

  story(
    update,
    given(profileValidation.model),
    message(Message.ClickedResetProfile()),
    model(model => {
      expect(profileForm.values(model.profile)).toEqual({
        email: 'reader@example.com',
        displayName: 'Reader',
        topics: [],
      })
      expect(profileForm.submission(model.profile)._tag).toBe('Idle')
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Submitting',
      )
    }),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.Message.CompletedSubmit({
          token: { generation: 1 },
          result: Result.succeed(undefined),
        }),
      }),
    ),
    model(model =>
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Succeeded',
      ),
    ),
  )
})

test('profile topic clicks derive each replacement from the current Model and capture Command values', () => {
  story(
    update,
    given(init().model),
    message(Message.ClickedProfileTopic({ topic: 'Effect' })),
    message(Message.ClickedProfileTopic({ topic: 'Foldkit' })),
    message(Message.SubmittedProfile()),
    Command.resolve(
      profileForm.ValidateField.email,
      completedProfileValidation(),
    ),
    Command.expectExact(
      profileForm.Submit({
        values: {
          email: 'reader@example.com',
          displayName: 'Reader',
          topics: ['Effect', 'Foldkit'],
        },
        token: { generation: 1 },
      }),
    ),
    Command.resolve(
      profileForm.Submit({
        values: {
          email: 'reader@example.com',
          displayName: 'Reader',
          topics: ['Effect', 'Foldkit'],
        },
        token: { generation: 1 },
      }),
      profileForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(undefined),
      }),
    ),
    message(Message.ClickedProfileTopic({ topic: 'Effect' })),
    model(model =>
      expect(profileForm.values(model.profile).topics).toEqual(['Foldkit']),
    ),
    message(Message.ClickedResetProfile()),
    model(model =>
      expect(profileForm.values(model.profile).topics).toEqual([]),
    ),
  )
})
