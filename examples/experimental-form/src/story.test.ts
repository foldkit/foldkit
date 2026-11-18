import { Result } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import {
  Message,
  RegistrationRejection,
  init,
  profileForm,
  registrationForm,
  update,
} from './main'
import {
  completedProfileValidation,
  completedRegistrationValidation,
} from './validationFixtures'

const validRegistrationModel = () => {
  const initial = init()
  const emailChange = update(
    initial.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('email', 'person@example.com'),
    }),
  )
  const nameChange = update(
    emailChange.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('name', 'Person'),
    }),
  )
  const ageChange = update(
    nameChange.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('age', '30'),
    }),
  )

  return ageChange.model
}

test('Form Command success settles the registration Form and informs the parent', () => {
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
        result: Result.succeed('person@example.com'),
      }),
    ),
    model(model => {
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Succeeded',
      )
      expect(model.registeredEmails).toEqual(['person@example.com'])
    }),
  )
})

test('a taken email shows on the email field until it is edited', () => {
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
        result: Result.fail(RegistrationRejection.EmailTaken()),
      }),
    ),
    model(model => {
      expect(registrationForm.submission(model.registration)).toEqual(
        registrationForm.Submission.Failed({
          error: RegistrationRejection.EmailTaken(),
        }),
      )
      expect(
        registrationForm.field(model.registration, 'email').errors,
      ).toEqual(['This email is already registered'])
      expect(model.registeredEmails).toEqual([])
    }),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.blurred('email'),
      }),
    ),
    model(model =>
      expect(
        registrationForm.field(model.registration, 'email').errors,
      ).toEqual(['This email is already registered']),
    ),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.changed('email', 'other@example.com'),
      }),
    ),
    model(model =>
      expect(
        registrationForm.field(model.registration, 'email').errors,
      ).toEqual([]),
    ),
  )
})

test('an unmapped rejection stays at the form level', () => {
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
        result: Result.fail(RegistrationRejection.RegistrationUnavailable()),
      }),
    ),
    model(model => {
      expect(registrationForm.submission(model.registration)._tag).toBe(
        'Failed',
      )
      expect(
        registrationForm.field(model.registration, 'email').errors,
      ).toEqual([])
    }),
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
      message: registrationForm.changed('email', 'new@example.com'),
    }),
  )
  const nameChange = update(
    emailChange.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('name', 'New person'),
    }),
  )
  const ageChange = update(
    nameChange.model,
    Message.GotRegistrationMessage({
      message: registrationForm.changed('age', '30'),
    }),
  )
  const secondSubmit = update(ageChange.model, Message.SubmittedRegistration())
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
          result: Result.succeed('person@example.com'),
        }),
      }),
    ),
    Command.expectNone(),
    model(model =>
      expect(registrationForm.submission(model.registration)).toMatchObject({
        _tag: 'Submitting',
        token: { generation: 2 },
      }),
    ),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.Message.CompletedSubmit({
          token: { generation: 2 },
          result: Result.succeed('person@example.com'),
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
      expect(profileForm.inputs(model.profile)).toEqual({
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
          result: Result.succeed('person@example.com'),
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
        context: { profileId: 'profile-1' },
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
        context: { profileId: 'profile-1' },
        token: { generation: 1 },
      }),
      profileForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(undefined),
      }),
    ),
    message(Message.ClickedProfileTopic({ topic: 'Effect' })),
    model(model =>
      expect(profileForm.inputs(model.profile).topics).toEqual(['Foldkit']),
    ),
    message(Message.ClickedResetProfile()),
    model(model =>
      expect(profileForm.inputs(model.profile).topics).toEqual([]),
    ),
  )
})
