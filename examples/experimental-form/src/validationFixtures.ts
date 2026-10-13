import { Result } from 'effect'

import { profileForm, registrationForm } from './main'

export const completedRegistrationValidation = (generation = 1) =>
  registrationForm.Message.CompletedValidateField({
    name: 'email',
    generation,
    result: Result.succeed([]),
  })
export const completedProfileValidation = () =>
  profileForm.Message.CompletedValidateField({
    name: 'email',
    generation: 1,
    result: Result.succeed([]),
  })
