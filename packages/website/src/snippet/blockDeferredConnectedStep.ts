import { Number } from 'effect'
import { Update } from 'foldkit'

import * as Parent from './blockDeferredConnectedStepSetup'

const resetSettings = Parent.ApplicationBlock.makeStep(() =>
  Update.combineSteps([
    Parent.SettingsBinding.requestReset(),
    Parent.ApplicationBlock.makeFieldsStep(() => ({
      resetCount: Number.increment,
    })),
  ]),
)

export const update = Parent.ApplicationComposition.makeUpdate({
  RequestedResetSettings: model => resetSettings(model),
})
