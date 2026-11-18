import { Result } from 'effect'
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

test('a taken email shows on the email field until it is edited', () => {
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
      expect(
        registrationForm.fieldView(model.registration, 'email').errors,
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
        registrationForm.fieldView(model.registration, 'email').errors,
      ).toEqual(['This email is already registered']),
    ),
    message(
      Message.GotRegistrationMessage({
        message: registrationForm.changed('email', 'other@example.com'),
      }),
    ),
    model(model =>
      expect(
        registrationForm.fieldView(model.registration, 'email').errors,
      ).toEqual([]),
    ),
  )
})

test('an unmapped rejection stays at the form level', () => {
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
      expect(registrationForm.submission(model.registration)).toEqual(
        registrationForm.Submission.Failed({
          error: RegistrationRejection.RegistrationUnavailable(),
        }),
      )
      expect(
        registrationForm.fieldView(model.registration, 'email').errors,
      ).toEqual([])
    }),
  )
})

test('profile topic clicks build the array from the current Model and submit it with the profile id', () => {
  const submitProfile = profileForm.Submit({
    values: {
      email: 'reader@example.com',
      displayName: 'Reader',
      topics: ['Effect', 'Foldkit'],
    },
    context: { profileId: 'profile-1' },
    generation: 1,
  })

  story(
    update,
    given(init().model),
    message(Message.ClickedProfileTopic({ topic: 'Effect' })),
    message(Message.ClickedProfileTopic({ topic: 'Foldkit' })),
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
