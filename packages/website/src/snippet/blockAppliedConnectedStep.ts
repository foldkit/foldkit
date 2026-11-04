// ❌ The Block producer's Model does not carry Composition registration.
import { Number } from 'effect'
import { Update } from 'foldkit'

import * as Parent from './blockDeferredConnectedStepSetup'

export const resetSettings = Parent.ApplicationBlock.makeStep(model =>
  Update.combineSteps(model, [
    Parent.SettingsBinding.requestReset(),
    Parent.ApplicationBlock.makeFieldsStep(() => ({
      resetCount: Number.increment,
    })),
  ]),
)
