// ❌ A raw local result loses its canonical contract beside a connected recipe.
import * as Parent from './blockDeferredConnectedStepSetup'

export const update = Parent.ApplicationComposition.makeUpdate({
  RequestedResetSettings: model => {
    if (model.resetCount === 0) {
      return { model }
    }

    return Parent.SettingsBinding.requestReset()(model)
  },
})
