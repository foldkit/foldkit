import { Number } from 'effect'
import { Update } from 'foldkit'

import * as Parent from './blockDeferredConnectedStepSetup'

const resetSettings = Parent.ApplicationDefinition.makeStep(() =>
  Update.combineSteps([
    Parent.SettingsBinding.requestReset(),
    Parent.ApplicationDefinition.makeFieldsStep(() => ({
      resetCount: Number.increment,
    })),
  ]),
)

export const update = Parent.ApplicationComposition.makeUpdate({
  RequestedResetSettings: model => resetSettings(model),
})
