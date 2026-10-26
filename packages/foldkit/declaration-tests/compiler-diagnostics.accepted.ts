import { Update } from 'foldkit'

import {
  Binding,
  Composition,
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
