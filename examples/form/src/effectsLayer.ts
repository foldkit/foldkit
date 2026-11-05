import { Layer } from 'effect'

import { SubmitForm, ValidateEmail } from './command'

export const EffectsLayer = Layer.mergeAll(
  ValidateEmail.layer,
  SubmitForm.layer,
)
