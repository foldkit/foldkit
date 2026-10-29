import { Update } from 'foldkit'

import {
  Binding,
  Composition,
  Definition,
  Save,
  connectedSteps,
  deferredConnectedStep,
  init,
  saveUpdate,
  update,
  view,
} from './compiler-diagnostics.fixture.js'

export const directConnectedUpdate = Composition.makeUpdate({
  CompletedSave: model => Binding.requestIncrement()(model),
  Clicked: model => Binding.requestIncrement()(model),
})
export const combinedConnectedUpdate = Composition.makeUpdate({
  CompletedSave: model => Update.combineSteps(model, connectedSteps),
  Clicked: model => Update.combineSteps(model, connectedSteps),
})
export const curriedConnectedUpdate = Composition.makeUpdate({
  CompletedSave: model => Update.combineSteps(connectedSteps)(model),
  Clicked: model => Update.combineSteps(connectedSteps)(model),
})
export const deferredConnectedUpdate = Composition.makeUpdate({
  Clicked: deferredConnectedStep,
  CompletedSave: deferredConnectedStep,
})

const keepModelStep = Definition.makeNoopStep()
const keepModelWithStep = Definition.makeStep(model => ({ model }))

export const mixedConnectedUpdate = Composition.makeUpdate({
  Clicked: model =>
    model.child.count > 0
      ? Binding.requestIncrement()(model)
      : keepModelStep(model),
  CompletedSave: model => ({ model }),
})

export const mixedContextualUpdate = Composition.makeUpdate.withContext(
  (isEnabled: boolean) => ({
    Clicked: model =>
      isEnabled ? Binding.requestIncrement()(model) : keepModelWithStep(model),
    CompletedSave: model => ({ model }),
  }),
)

export const ordinaryBlock = Composition.prepareBlock({ init, update, view })
export const locallyHandledBlock = Composition.prepareBlock({
  init,
  update: saveUpdate,
  EffectsLayer: Save.layer,
})
export const hostHandledBlock = Composition.prepareBlock({
  init,
  update: saveUpdate,
  hostHandlers: [Save],
})
