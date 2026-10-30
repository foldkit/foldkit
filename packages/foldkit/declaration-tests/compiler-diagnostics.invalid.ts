import { Effect } from 'effect'
import { Block, Program, Update } from 'foldkit'

import {
  Binding,
  Composition,
  Definition,
  ElementBlock,
  ProgramFlags,
  UnregisteredComposition,
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

const prepare = () => Composition.prepareBlock({ init, update, view })
Block.assemble(prepare)

Program.make({
  block: ElementBlock,
  Flags: ProgramFlags,
  flags: Effect.succeed({ session: 'work-orders' }),
  container: null,
})

const unregisteredUpdate = UnregisteredComposition.makeUpdate({
  Clicked: model => Binding.requestIncrement()(model),
  CompletedSave: model => ({ model }),
})
UnregisteredComposition.prepareBlock({
  init: () => ({ model }),
  update: unregisteredUpdate,
})
