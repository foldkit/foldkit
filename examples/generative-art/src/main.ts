import { Array, Option } from 'effect'
import { Runtime } from 'foldkit'

import { Slider } from '@foldkit/ui'

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

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    particles: [],
    nextId: 0,
    elapsedSeconds: 0,
    maybeMousePosition: Option.none(),
    isRunning: true,
    flowStrength: Slider.snapAndClamp(
      1.4,
      FLOW_STRENGTH_MIN,
      FLOW_STRENGTH_MAX,
      0.05,
    ),
    flowStrengthSlider: Slider.init({
      id: 'flow-strength-slider',
      min: FLOW_STRENGTH_MIN,
      max: FLOW_STRENGTH_MAX,
      step: 0.05,
    }),
    noiseScale: Slider.snapAndClamp(
      1,
      NOISE_SCALE_MIN_DIVISOR,
      NOISE_SCALE_MAX_DIVISOR,
      0.05,
    ),
    noiseScaleSlider: Slider.init({
      id: 'noise-scale-slider',
      min: NOISE_SCALE_MIN_DIVISOR,
      max: NOISE_SCALE_MAX_DIVISOR,
      step: 0.05,
    }),
  },
  Array.makeBy(INITIAL_PARTICLE_COUNT, () => SpawnAmbientParticle()),
]

export { Message, Model, subscriptions, update, view }
