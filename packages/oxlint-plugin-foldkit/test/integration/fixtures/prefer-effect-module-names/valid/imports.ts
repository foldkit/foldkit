import {
  Match,
  Order as EffectOrder,
  Schema,
  String,
  pipe as effectPipe,
} from 'effect'

const Model = Schema.Struct({ value: Schema.String })
const render = Match.value(Model.make({ value: 'value' })).pipe(
  Match.when({ value: String.isNonEmpty }, effectPipe),
  Match.orElse(() => undefined),
)

export { Model, render }

export const LocalOrder = EffectOrder.Number
