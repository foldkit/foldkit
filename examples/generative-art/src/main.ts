import { Array, Option } from 'effect'
import { Runtime, Ui } from 'foldkit'

import { SpawnAmbientParticle } from './command'
import {
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  INITIAL_PARTICLE_COUNT,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
} from './constant'
import { Message } from './message'
import { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    particles: [],
    nextId: 0,
    elapsedSeconds: 0,
    maybeMousePosition: Option.none(),
    isRunning: true,
    flowStrengthSlider: Ui.Slider.init({
      id: 'flow-strength-slider',
      min: FLOW_STRENGTH_MIN,
      max: FLOW_STRENGTH_MAX,
      step: 0.05,
      initialValue: 1.4,
    }),
    noiseScaleSlider: Ui.Slider.init({
      id: 'noise-scale-slider',
      min: NOISE_SCALE_MIN_DIVISOR,
      max: NOISE_SCALE_MAX_DIVISOR,
      step: 0.05,
      initialValue: 1,
    }),
  },
  Array.makeBy(INITIAL_PARTICLE_COUNT, () => SpawnAmbientParticle()),
]

export { Message, Model, subscriptions, update, view }
