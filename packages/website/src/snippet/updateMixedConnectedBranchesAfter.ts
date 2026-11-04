// ✅ Give the local branch its Block-owned result contract.
import * as Parent from './blockDeferredConnectedStepSetup'

const { makeNoopStep } = Parent.ApplicationBlock

export const update = Parent.ApplicationComposition.makeUpdate({
  RequestedResetSettings: model => {
    if (model.resetCount === 0) {
      return makeNoopStep()(model)
    }

    return Parent.SettingsBinding.requestReset()(model)
  },
})
