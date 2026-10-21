import { Layer, Schema } from 'effect'
import { Block, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  CounterBlock,
  CounterComposition,
  CounterModel,
  CounterOutMessage,
  ErasedCounterBlock,
  PanelComposition,
  SaveCount,
  counterInit,
  counterUpdate,
  counterView,
  panelInit,
  panelUpdate,
  panelView,
  program,
} from './implemented-block.accepted.js'

// @ts-expect-error assembleBlock() requires the SaveCount handler Layer.
CounterComposition.implement({
  init: counterInit,
  update: counterUpdate,
}).assembleBlock()

// @ts-expect-error assembleBlock() rejects a local Layer that omits the handler.
CounterComposition.implement({
  init: counterInit,
  update: counterUpdate,
  view: counterView,
  EffectsLayer: Layer.empty,
}).assembleBlock()

const foreignViewImplementation = {
  init: counterInit,
  update: counterUpdate,
  view: panelView,
  EffectsLayer: SaveCount.layer,
}
// @ts-expect-error implement requires a view authored by this Composition.
CounterComposition.implement(foreignViewImplementation)

const extraFieldImplementation = {
  init: panelInit,
  update: panelUpdate,
  view: panelView,
  unexpected: true,
}
// @ts-expect-error implement rejects fields outside the implementation contract.
PanelComposition.implement(extraFieldImplementation)

const outMessageInitImplementation = {
  init: () => ({
    model: { count: 0 },
    outMessage: CounterOutMessage.Saved({ count: 0 }),
  }),
  update: counterUpdate,
  view: counterView,
  EffectsLayer: SaveCount.layer,
}
// @ts-expect-error implement rejects a raw init that emits an OutMessage.
CounterComposition.implement(outMessageInitImplementation)

// @ts-expect-error A broadly annotated implementation cannot produce a usable Block.
ErasedCounterBlock.init

// @ts-expect-error The Program requires the Store Service used by the child handler.
Runtime.run(program)

const WrongParent = Block.makeDefinition('ImplementedWrongParent', {
  Model: Schema.Struct({ counter: Schema.String }),
  Message: defineMessageUnion({ ClickedWrong: {} }),
})
// @ts-expect-error A parent field must match the implemented child's Model.
WrongParent.makeBinding(CounterBlock, { field: 'counter' })

const UnhandledParent = Block.makeDefinition('ImplementedUnhandledParent', {
  Model: Schema.Struct({ counter: CounterModel }),
  Message: defineMessageUnion({ ClickedUnhandled: {} }),
})
const unhandledCounterBinding = UnhandledParent.makeBinding(CounterBlock, {
  field: 'counter',
})
// @ts-expect-error The implemented child's OutMessage needs a parent policy.
UnhandledParent.makeComposition({ bindings: [unhandledCounterBinding] })
