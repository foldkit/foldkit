import { Option, Result } from 'effect'
import { Command, given, message, model, steps, story } from 'foldkit/story'
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
  completedValidateProfileEmail,
  completedValidateRegistrationEmail,
} from './main.fixture'

const submitValidRegistration = steps(
  given(init().model),
  message(
    Message.GotRegistrationMessage({
      message: registrationForm.changed('email', 'person@example.com'),
    }),
  ),
  message(
    Message.GotRegistrationMessage({
      message: registrationForm.changed('fullName', 'Person'),
    }),
  ),
  message(
    Message.GotRegistrationMessage({
      message: registrationForm.changed('age', '30'),
    }),
  ),
  message(
    Message.GotRegistrationMessage({
      message: registrationForm.changed('mainTopic', 'Effect'),
    }),
  ),
  message(Message.SubmittedRegistrationForm()),
  Command.resolve(
    registrationForm.ValidateField.email,
    completedValidateRegistrationEmail(),
  ),
)

test('a successful registration settles the Form and records the email in the parent', () => {
  story(
    update,
    submitValidRegistration,
    Command.resolve(
      registrationForm.Submit,
      registrationForm.Message.CompletedSubmit({
        generation: 1,
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

test('an unmapped rejection is the form error', () => {
  story(
    update,
    submitValidRegistration,
    Command.resolve(
      registrationForm.Submit,
      registrationForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail(RegistrationRejection.RegistrationUnavailable()),
      }),
    ),
    model(model => {
      expect(registrationForm.formError(model.registration)).toEqual(
        Option.some(RegistrationRejection.RegistrationUnavailable()),
      )
      expect(
        registrationForm.fieldView(model.registration, 'email').errors,
      ).toEqual([])
    }),
  )
})

test('a taken email shows on the email field and is not the form error', () => {
  story(
    update,
    submitValidRegistration,
    Command.resolve(
      registrationForm.Submit,
      registrationForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail(RegistrationRejection.EmailTaken()),
      }),
    ),
    model(model => {
      expect(registrationForm.formError(model.registration)).toEqual(
        Option.none(),
      )
      expect(
        registrationForm.fieldView(model.registration, 'email').errors,
      ).toEqual(['This email is already registered'])
    }),
  )
})

test('the weekly digest turns on email updates, and turning off updates turns off the digest', () => {
  story(
    update,
    given(init().model),
    message(Message.ClickedWeeklyDigest()),
    model(model => {
      expect(profileForm.inputs(model.profile)).toMatchObject({
        isSubscribed: true,
        isDigestEnabled: true,
      })
    }),
    message(Message.ClickedEmailUpdates()),
    model(model => {
      expect(profileForm.inputs(model.profile)).toMatchObject({
        isSubscribed: false,
        isDigestEnabled: false,
      })
    }),
  )
})

test('profile topic clicks add and remove topics, and the submission carries the profile id', () => {
  const submitProfile = profileForm.Submit({
    values: {
      email: 'reader@example.com',
      displayName: 'Reader',
      topics: ['Foldkit'],
      isSubscribed: false,
      isDigestEnabled: false,
    },
    context: { profileId: 'profile-1' },
    generation: 1,
  })

  story(
    update,
    given(init().model),
    message(Message.ClickedProfileTopic({ topic: 'Effect' })),
    message(Message.ClickedProfileTopic({ topic: 'Foldkit' })),
    message(Message.ClickedProfileTopic({ topic: 'Effect' })),
    message(Message.SubmittedProfileForm()),
    Command.resolve(
      profileForm.ValidateField.email,
      completedValidateProfileEmail(),
    ),
    Command.expectExact(submitProfile),
    Command.resolve(
      submitProfile,
      profileForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.succeed(undefined),
      }),
    ),
  )
})
