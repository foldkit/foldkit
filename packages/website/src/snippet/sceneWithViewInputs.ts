import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect, role, scene, init as sceneInit } from 'foldkit/scene'

import {
  type SliderAttributes,
  SliderBlock,
  layer as SliderLayer,
} from '@foldkit/ui/slider'

const Model = Schema.Struct({ slider: SliderBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({})
type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')

type ViewInputs = Readonly<{ value: number; isDisabled?: boolean }>

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

const { makeNoopStep } = ApplicationDefinition

const SliderBinding = ApplicationDefinition.makeBinding(SliderBlock, {
  field: 'slider',
  init: {
    contextToArgs: () => [{ id: 'volume', min: 0, max: 10, step: 1 }],
  },
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SliderBlock, {
    ChangedValue: makeNoopStep,
  }),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
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
        toView: (attributes: SliderAttributes) =>
          ih.div(
            [...attributes.root],
            [ih.div([...attributes.track]), ih.div([...attributes.thumb])],
          ),
      },
    }),
  ),
)

const init = ApplicationComposition.makeInit(() => ({ model: {} }))

const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const slider = yield* SliderBinding

    return {
      children: [slider],
      init,
      update,
      view,
    }
  }),
).provide(SliderLayer)

await Effect.runPromise(
  scene(
    { block: ApplicationBlock, viewInputs: { value: 5 } },
    sceneInit(),
    expect(role('slider')).toHaveAttr('aria-valuenow', '5'),
  ),
)

await Effect.runPromise(
  scene(
    { block: ApplicationBlock, viewInputs: { value: 5, isDisabled: true } },
    sceneInit(),
    expect(role('slider')).toHaveAttr('aria-disabled', 'true'),
  ),
)
