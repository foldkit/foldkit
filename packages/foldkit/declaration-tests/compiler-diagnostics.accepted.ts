import { Effect } from 'effect'
import { Program, Update } from 'foldkit'

import {
  Binding,
  Composition,
  Definition,
  ElementBlock,
  ProgramFlags,
  Save,
  connectedSteps,
  deferredConnected,
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
  Clicked: deferredConnected,
  CompletedSave: deferredConnected,
})

const keepModel = Definition.makeNoopStep()
const preserveModel = Definition.makeStep(model => ({ model }))

export const mixedConnectedUpdate = Composition.makeUpdate({
  Clicked: model =>
    model.child.count > 0
      ? Binding.requestIncrement()(model)
      : keepModel(model),
  CompletedSave: model => ({ model }),
})

export const mixedContextualUpdate = Composition.makeUpdate.withContext(
  (isEnabled: boolean) => ({
    Clicked: model =>
      isEnabled ? Binding.requestIncrement()(model) : preserveModel(model),
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

export const elementProgram = Program.makeElement({
  block: ElementBlock,
  Flags: ProgramFlags,
  flags: Effect.succeed({ session: 'work-orders' }),
  container: null,
})
