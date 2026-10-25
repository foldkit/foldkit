import { Update } from 'foldkit'

import {
  Binding,
  Composition,
  Definition,
  connectedSteps,
  init,
  model,
  outMessageSteps,
  saveUpdate,
  update,
  view,
} from './compiler-diagnostics.fixture.js'

Binding.requestIncrement()(model)
Update.combineSteps(model, [
  Definition.makeNoopStep(),
  Binding.requestIncrement(),
])
Update.combineSteps(connectedSteps)(model)
Update.combineSteps(model, outMessageSteps)
Update.combineSteps(outMessageSteps)(model)

Composition.prepareBlock({ init, update, view: () => null })
Composition.prepareBlock({ init, update: saveUpdate, view })
