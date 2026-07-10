import { Array, Option } from 'effect'
import { Runtime } from 'foldkit'

import { Slider } from '@foldkit/ui'

import { SpawnAmbientParticle } from './command'
import {
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  FLOW_STRENGTH_STEP,
  INITIAL_FLOW_STRENGTH,
  INITIAL_NOISE_SCALE,
  INITIAL_PARTICLE_COUNT,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
  NOISE_SCALE_STEP,
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
      INITIAL_FLOW_STRENGTH,
      FLOW_STRENGTH_MIN,
      FLOW_STRENGTH_MAX,
      FLOW_STRENGTH_STEP,
    ),
    flowStrengthSlider: Slider.init({
      id: 'flow-strength-slider',
      min: FLOW_STRENGTH_MIN,
      max: FLOW_STRENGTH_MAX,
      step: FLOW_STRENGTH_STEP,
    }),
    noiseScale: Slider.snapAndClamp(
      INITIAL_NOISE_SCALE,
      NOISE_SCALE_MIN_DIVISOR,
      NOISE_SCALE_MAX_DIVISOR,
      NOISE_SCALE_STEP,
    ),
    noiseScaleSlider: Slider.init({
      id: 'noise-scale-slider',
      min: NOISE_SCALE_MIN_DIVISOR,
      max: NOISE_SCALE_MAX_DIVISOR,
      step: NOISE_SCALE_STEP,
    }),
  },
  Array.makeBy(INITIAL_PARTICLE_COUNT, () => SpawnAmbientParticle()),
]

export { Message, Model, subscriptions, update, view }
