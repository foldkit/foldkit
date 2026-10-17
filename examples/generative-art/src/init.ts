import { Array, Option } from 'effect'

import { snapAndClamp } from '@foldkit/ui/slider'

import { GenerateAmbientParticle } from './command'
import { ApplicationComposition } from './composition'
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

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    particles: [],
    nextId: 0,
    elapsedSeconds: 0,
    maybeMousePosition: Option.none(),
    isRunning: true,
    flowStrength: snapAndClamp(
      INITIAL_FLOW_STRENGTH,
      FLOW_STRENGTH_MIN,
      FLOW_STRENGTH_MAX,
      FLOW_STRENGTH_STEP,
    ),
    noiseScale: snapAndClamp(
      INITIAL_NOISE_SCALE,
      NOISE_SCALE_MIN_DIVISOR,
      NOISE_SCALE_MAX_DIVISOR,
      NOISE_SCALE_STEP,
    ),
  },
  commands: Array.makeBy(INITIAL_PARTICLE_COUNT, () =>
    GenerateAmbientParticle(),
  ),
}))
