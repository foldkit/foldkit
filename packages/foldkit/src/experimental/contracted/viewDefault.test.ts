import { Effect, Layer, Schema } from 'effect'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Scene from '../../scene/public.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
const CounterMessage = defineMessageUnion({ ClickedIncrement: {} })

const DefaultKey = Symbol('ViewDefaultRuntime')
const DefaultBlock = Block.make('ViewDefaultRuntime', {
  key: DefaultKey,
  Model: CounterModel,
  Message: CounterMessage,
  InitArgs: Schema.Tuple([]),
})
const DefaultComposition = DefaultBlock.makeComposition()
const defaultInit = DefaultComposition.makeInit(() => ({
  model: { count: 0 },
}))
const defaultUpdate = DefaultComposition.makeUpdate({
  ClickedIncrement: DefaultBlock.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
})
const defaultView = DefaultComposition.makeView((model, h) =>
  h.button(
    [h.OnClick(CounterMessage.ClickedIncrement())],
    [`Default: ${model.count}`],
  ),
)
const DefaultLayer = DefaultBlock.makeLayer({
  init: defaultInit,
  update: defaultUpdate,
  view: defaultView,
})

const Inputs = Schema.Struct({ label: Schema.String })
type Inputs = typeof Inputs.Type
const InputsKey = Symbol('ViewDefaultInputsRuntime')
const InputsBlock = Block.make('ViewDefaultInputsRuntime', {
  key: InputsKey,
  Model: CounterModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { Inputs },
})
const InputsComposition = InputsBlock.makeComposition()
const inputsInit = InputsComposition.makeInit(() => ({
  model: { count: 3 },
}))
const inputsUpdate = InputsComposition.makeUpdate({})
const inputsView = InputsComposition.makeView.withInputs(
  (model, { label }, h) => h.div([], [`${label}: ${model.count}`]),
)
const InputsLayer = InputsBlock.makeLayer({
  init: inputsInit,
  update: inputsUpdate,
  view: inputsView,
})

const ViewlessKey = Symbol('ViewDefaultViewlessRuntime')
const ViewlessBlock = Block.make('ViewDefaultViewlessRuntime', {
  key: ViewlessKey,
  Model: CounterModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const ViewlessComposition = ViewlessBlock.makeComposition()
const viewlessInit = ViewlessComposition.makeInit(() => ({
  model: { count: 7 },
}))
const viewlessUpdate = ViewlessComposition.makeUpdate({})
const ViewlessLayer = ViewlessBlock.makeLayer({
  init: viewlessInit,
  update: viewlessUpdate,
})
const alternateView = ViewlessComposition.makeView.withInputs<Inputs>(
  (model, { label }, h) => h.div([], [`${label}: ${model.count}`]),
)
const ParentKey = Symbol('ViewDefaultAlternateParentRuntime')
const ParentBlock = Block.make('ViewDefaultAlternateParentRuntime', {
  key: ParentKey,
  Model: Schema.Struct({ child: ViewlessBlock.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const ChildBinding = ParentBlock.makeRequiredFieldBinding(ViewlessBlock, {
  field: 'child',
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildBinding],
})
const ParentLayer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const child = yield* ChildBinding

    return {
      children: [child],
      init: ParentComposition.makeInit(() => ({ model: {} })),
      update: ParentComposition.makeUpdate({}),
      view: ParentComposition.makeView((model, h) =>
        h.block(
          ChildBinding.embedView({
            slotId: 'child',
            model: model.child,
            view: alternateView,
            viewInputs: { label: 'Alternate' },
          }),
        ),
      ),
    }
  }),
)
const SelectedParentLayer = Layer.provide(ParentLayer, ViewlessLayer)

describe('contracted view defaults', () => {
  it.effect('renders and updates an omitted default Element view', () =>
    Scene.scene(
      { block: DefaultBlock, layer: DefaultLayer },
      Scene.init(),
      Scene.click(Scene.role('button', { name: 'Default: 0' })),
      Scene.expect(Scene.role('button', { name: 'Default: 1' })).toExist(),
    ),
  )

  it.effect('renders an inputs-only default Element view', () =>
    Scene.scene(
      {
        block: InputsBlock,
        layer: InputsLayer,
        viewInputs: { label: 'Inputs' },
      },
      Scene.init(),
      Scene.expect(Scene.text('Inputs: 3')).toExist(),
    ),
  )

  it.effect('embeds an explicit alternate view for a view:false child', () =>
    Scene.scene(
      {
        block: ParentBlock,
        layer: SelectedParentLayer,
      },
      Scene.init(),
      Scene.expect(Scene.text('Alternate: 7')).toExist(),
    ),
  )
})
