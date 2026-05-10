import { Array, Option } from 'effect'
import { Runtime } from 'foldkit'

import { SpawnAmbientParticle } from './command'
import { INITIAL_PARTICLE_COUNT } from './constant'
import { Message } from './message'
import { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    particles: [],
    nextId: 0,
    elapsedSeconds: 0,
    maybeMousePosition: Option.none(),
    isRunning: true,
    flowStrength: 1.4,
    noiseScaleMultiplier: 1,
  },
  Array.makeBy(INITIAL_PARTICLE_COUNT, () => SpawnAmbientParticle()),
]

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)
