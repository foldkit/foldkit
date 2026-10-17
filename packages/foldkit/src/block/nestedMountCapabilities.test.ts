import { Effect, Schema } from 'effect'
import { expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { define } from './define.js'

const LeafModel = Schema.Struct({ count: Schema.Number })
const LeafMessage = defineMessageUnion({ CompletedObserveLeaf: {} })
const MountCapabilityLeaf = define('MountCapabilityLeaf', {
  Model: LeafModel,
  Message: LeafMessage,
})
const ObserveLeaf = MountCapabilityLeaf.mount('ObserveLeaf', {
  messages: [LeafMessage.CompletedObserveLeaf],
  handler: function* () {
    return () => Effect.succeed(LeafMessage.CompletedObserveLeaf())
  },
})
const leafRegistered = MountCapabilityLeaf.makeComposition({
  mounts: [ObserveLeaf],
})
const leafView = leafRegistered.makeView((model, h) =>
  h.div([h.OnMount(ObserveLeaf())], [globalThis.String(model.count)]),
)
const leafBlock = leafRegistered.makeBlock({
  init: () => ({ model: LeafModel.make({ count: 0 }) }),
  update: leafRegistered.makeUpdate(model => ({ model })),
  view: leafView,
  EffectsLayer: ObserveLeaf.layer,
})

const MiddleModel = Schema.Struct({ leaf: LeafModel })
const MiddleMessage = defineMessageUnion({
  GotLeafMessage: { message: LeafMessage },
})
const MountCapabilityMiddle = define('MountCapabilityMiddle', {
  Model: MiddleModel,
  Message: MiddleMessage,
})
const LeafBinding = MountCapabilityMiddle.bindChild(leafBlock, {
  field: 'leaf',
  parentMessage: MiddleMessage.GotLeafMessage,
  init: false,
})
const middleRegistered = MountCapabilityMiddle.makeComposition({
  childBindings: [LeafBinding],
})
const middleGraphless = MountCapabilityMiddle.makeComposition()
const middleView = middleRegistered.makeView((model, h) =>
  h.block(
    LeafBinding.embedView({
      slotId: 'leaf',
      model: model.leaf,
    }),
  ),
)
const middleBlock = middleRegistered.makeBlock({
  init: middleRegistered.makeInit(() =>
    LeafBinding.init({
      args: [],
      toParentModel: leaf => MiddleModel.make({ leaf }),
    }),
  ),
  update: middleRegistered.makeUpdate(),
  view: middleView,
})

const RootModel = Schema.Struct({ middle: MiddleModel })
const RootMessage = defineMessageUnion({
  GotMiddleMessage: { message: MiddleMessage },
})
const MountCapabilityRoot = define('MountCapabilityRoot', {
  Model: RootModel,
  Message: RootMessage,
})
const MiddleBinding = MountCapabilityRoot.bindChild(middleBlock, {
  field: 'middle',
  parentMessage: RootMessage.GotMiddleMessage,
  init: false,
})
const rootRegistered = MountCapabilityRoot.makeComposition({
  childBindings: [MiddleBinding],
})
const rootGraphless = MountCapabilityRoot.makeComposition()
const rootView = rootRegistered.makeView((model, h) =>
  h.block(
    MiddleBinding.embedView({
      slotId: 'middle',
      model: model.middle,
    }),
  ),
)
const rootBlock = rootRegistered.makeBlock({
  init: rootRegistered.makeInit(() =>
    MiddleBinding.init({
      args: [],
      toParentModel: middle => RootModel.make({ middle }),
    }),
  ),
  update: rootRegistered.makeUpdate(),
  view: rootView,
})

const SiblingMessage = defineMessageUnion({ CompletedObserveSibling: {} })
const MountCapabilitySibling = define('MountCapabilitySibling', {
  Model: MiddleModel,
  Message: SiblingMessage,
})
const ObserveSibling = MountCapabilitySibling.mount('ObserveSibling', {
  messages: [SiblingMessage.CompletedObserveSibling],
})

if (false) {
  middleGraphless.makeView((model, h) =>
    h.block(
      // @ts-expect-error The leaf binding is absent from this graph.
      LeafBinding.embedView({ slotId: 'omitted-leaf', model: model.leaf }),
    ),
  )

  rootGraphless.makeView((model, h) =>
    h.block(
      // @ts-expect-error The nested middle binding is absent from this graph.
      MiddleBinding.embedView({
        slotId: 'omitted-middle',
        model: model.middle,
      }),
    ),
  )

  middleRegistered.makeView((_model, h) =>
    h.div([
      // @ts-expect-error A sibling Mount is not a capability of the child graph.
      h.OnMount(ObserveSibling()),
    ]),
  )
}

it('carries a leaf Mount capability through two registered parent graphs', () => {
  expect(leafBlock.mounts).toContain(ObserveLeaf)
  expect(middleBlock.mounts).toContain(ObserveLeaf)
  expect(rootBlock.mounts).toContain(ObserveLeaf)
  expect(rootBlock.init().model).toEqual(
    RootModel.make({
      middle: MiddleModel.make({
        leaf: LeafModel.make({ count: 0 }),
      }),
    }),
  )
})
