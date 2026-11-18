import { Result } from 'effect'

import { profileForm, registrationForm } from './main'

export const completedValidateRegistrationEmail = () =>
  registrationForm.Message.CompletedValidateField({
    name: 'email',
    generation: 1,
    result: Result.succeed([]),
  })

export const completedValidateProfileEmail = () =>
  profileForm.Message.CompletedValidateField({
    name: 'email',
    generation: 1,
    result: Result.succeed([]),
  })
