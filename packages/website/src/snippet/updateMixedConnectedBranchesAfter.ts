// ✅ Give the local branch its Definition-owned result contract.
import * as Parent from './blockDeferredConnectedStepSetup'

const { makeNoopStep } = Parent.ApplicationDefinition

export const update = Parent.ApplicationComposition.makeUpdate({
  RequestedResetSettings: model => {
    if (model.resetCount === 0) {
      return makeNoopStep()(model)
    }

    return Parent.SettingsBinding.requestReset()(model)
  },
})
