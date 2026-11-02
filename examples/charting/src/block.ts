import { Effect, Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import {
  ChartModeRadioGroupBinding,
  PackageRadioGroupBinding,
  PeriodRadioGroupBinding,
} from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const chartModeRadioGroup = yield* ChartModeRadioGroupBinding
    const periodRadioGroup = yield* PeriodRadioGroupBinding
    const packageRadioGroup = yield* PackageRadioGroupBinding
    return {
      children: [chartModeRadioGroup, periodRadioGroup, packageRadioGroup],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(RadioGroup.layer))
