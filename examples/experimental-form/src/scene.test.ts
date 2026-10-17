import { Result } from 'effect'
import {
  Command,
  blur,
  click,
  expect,
  given,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { test } from 'vitest'

import {
  Message,
  init,
  profileForm,
  registrationForm,
  update,
  view,
} from './main'
import {
  completedProfileValidation,
  completedRegistrationValidation,
} from './validationFixtures'

test('ordinary inputs submit through the Form Command and render success', () => {
  scene(
    { update, view },
    given(init().model),
    type(role('textbox', { name: 'Registration email' }), 'person@example.com'),
    type(role('textbox', { name: 'Your name' }), 'Person'),
    click(role('button', { name: 'Register' })),
    Command.resolve(
      registrationForm.ValidateField.email,
      completedRegistrationValidation(),
    ),
    expect(text('Saving…')).toExist(),
    Command.resolve(
      registrationForm.Submit,
      registrationForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(undefined),
      }),
    ),
    expect(text('Saved')).toExist(),
  )
})

test('invalid submission shows untouched required-field errors', () => {
  scene(
    { update, view },
    given(init().model),
    click(role('button', { name: 'Register' })),
    Command.expectNone(),
    expect(text('Enter an email address')).toExist(),
    expect(text('Enter your name')).toExist(),
  )
})

test('failure feedback clears after editing and reset restores edit defaults', () => {
  scene(
    { update, view },
    given(init().model),
    click(role('button', { name: 'Save profile' })),
    Command.resolve(
      profileForm.ValidateField.email,
      completedProfileValidation(),
    ),
    Command.resolve(
      profileForm.Submit,
      profileForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.fail('Email is taken'),
      }),
    ),
    expect(text('Email is taken')).toExist(),
    type(role('textbox', { name: 'Profile email' }), 'new@example.com'),
    expect(text('Email is taken')).not.toExist(),
    click(role('button', { name: 'Reset profile' })),
    expect(role('textbox', { name: 'Profile email' })).toHaveValue(
      'reader@example.com',
    ),
  )
})

test('reset clears pending submission feedback', () => {
  const profileSubmit = update(init().model, Message.SubmittedProfile())
  const profileValidation = update(
    profileSubmit.model,
    Message.GotProfileMessage({
      message: completedProfileValidation(),
    }),
  )

  scene(
    { update, view },
    given(profileValidation.model),
    expect(text('Saving…')).toExist(),
    click(role('button', { name: 'Reset profile' })),
    expect(text('Saving…')).not.toExist(),
    expect(text('Saved')).not.toExist(),
  )
})

test('blur validates an input and the next edit clears its stale error', () => {
  scene(
    { update, view },
    given(init().model),
    type(role('textbox', { name: 'Registration email' }), 'invalid'),
    expect(text('Enter a valid email address')).not.toExist(),
    blur(role('textbox', { name: 'Registration email' })),
    expect(text('Enter a valid email address')).toExist(),
    type(role('textbox', { name: 'Registration email' }), 'person@example.com'),
    expect(text('Enter a valid email address')).not.toExist(),
    Command.expectNone(),
  )
})

test('profile checkboxes replace the array field and reset its captured defaults', () => {
  scene(
    { update, view },
    given(init().model),
    click(role('checkbox', { name: 'Effect' })),
    click(role('checkbox', { name: 'Foldkit' })),
    expect(role('checkbox', { name: 'Effect' })).toBeChecked(),
    expect(role('checkbox', { name: 'Foldkit' })).toBeChecked(),
    click(role('button', { name: 'Save profile' })),
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
      profileForm.Submit,
      profileForm.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(undefined),
      }),
    ),
    click(role('button', { name: 'Reset profile' })),
    expect(role('checkbox', { name: 'Effect' })).not.toBeChecked(),
    expect(role('checkbox', { name: 'Foldkit' })).not.toBeChecked(),
    expect(text('Saved')).not.toExist(),
  )
})
