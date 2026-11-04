import { Effect, Layer } from 'effect'

import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import {
  ChartModeRadioGroupBinding,
  PackageRadioGroupBinding,
  PeriodRadioGroupBinding,
} from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
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
).pipe(Layer.provide(Layer.mergeAll(RadioGroupLayer)))

export { ApplicationBlock } from './definition'
