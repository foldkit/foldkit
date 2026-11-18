import { Result } from 'effect'

import { profileForm, registrationForm } from './main'

export const completedRegistrationValidation = () =>
  registrationForm.Message.CompletedValidateField({
    name: 'email',
    generation: 1,
    result: Result.succeed([]),
  })

export const completedProfileValidation = () =>
  profileForm.Message.CompletedValidateField({
    name: 'email',
    generation: 1,
    result: Result.succeed([]),
  })
