import { Layer } from 'effect'

import { ApplicationLive } from './application'
import { ComputeEngineService, makeEngineLive } from './engine'

export const ComputeEngineTestLayer = Layer.succeed(ComputeEngineService, {
  engineId: 'engine-1',
  square: value => value * value,
})

export const application = ApplicationLive.pipe(
  Layer.provide(makeEngineLive(ComputeEngineTestLayer)),
)
