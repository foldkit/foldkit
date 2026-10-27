// ❌ The Definition producer's Model does not carry Composition registration.
import { Number } from 'effect'
import { Update } from 'foldkit'

import * as Parent from './blockDeferredConnectedStepSetup'

export const resetSettingsStep = Parent.ApplicationDefinition.makeStep(model =>
  Update.combineSteps(model, [
    Parent.SettingsBinding.requestReset(),
    Parent.ApplicationDefinition.makeFieldsStep(() => ({
      resetCount: Number.increment,
    })),
  ]),
)
