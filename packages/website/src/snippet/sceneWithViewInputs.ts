import { Effect, Layer, Schema } from 'effect'
import { Block, Scene } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Slider } from '@foldkit/ui'

const Model = Schema.Struct({ slider: Slider.SliderBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')

type ViewInputs = Readonly<{ value: number; isDisabled?: boolean }>

export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

const {
  makeNoopStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = ApplicationBlock

const SliderBinding = makeRequiredFieldBinding(Slider.SliderBlock, {
  field: 'slider',
  init: {
    contextToArgs: () => [{ id: 'volume', min: 0, max: 10, step: 1 }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Slider.SliderBlock, {
    ChangedValue: makeNoopStep,
  }),
})
const ApplicationComposition = makeComposition({
  bindings: [SliderBinding],
})

const update = ApplicationComposition.makeUpdate({})
const view = ApplicationComposition.makeView.withInputs<
  Readonly<{ value: number; isDisabled?: boolean }>
>((model, { value, isDisabled }, h) =>
  h.block(
    SliderBinding.embedView({
      slotId: 'volume',
      model: model.slider,
      viewInputs: {
        value,
        ...(isDisabled === undefined ? {} : { isDisabled }),
        toView: (attributes: Slider.SliderAttributes) =>
          ih.div(
            [...attributes.root],
            [ih.div([...attributes.track]), ih.div([...attributes.thumb])],
          ),
      },
    }),
  ),
)

const init = ApplicationComposition.makeInit(() => ({ model: {} }))

const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Slider.layer))

await Effect.runPromise(
  Scene.scene(
    { block: ApplicationBlock, layer, viewInputs: { value: 5 } },
    Scene.init(),
    Scene.expect(Scene.role('slider')).toHaveAttr('aria-valuenow', '5'),
  ),
)

await Effect.runPromise(
  Scene.scene(
    {
      block: ApplicationBlock,
      layer,
      viewInputs: { value: 5, isDisabled: true },
    },
    Scene.init(),
    Scene.expect(Scene.role('slider')).toHaveAttr('aria-disabled', 'true'),
  ),
)
