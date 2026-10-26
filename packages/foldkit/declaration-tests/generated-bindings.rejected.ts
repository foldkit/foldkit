import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import {
  CounterBlock,
  GeneratedBindingParentComposition,
  GeneratedBindingParentDefinition,
  ParentMessage,
  StatusBlock,
  readRoomCounter,
  readRoomId,
  readRooms,
} from './generated-bindings.accepted.js'

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  read: model => model.selected,
  // @ts-expect-error A contextual accessor requires generated delivery context.
  write: (model, nextCounter) =>
    modifyFields(model, { selected: () => Option.some(nextCounter) }),
})

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  // @ts-expect-error A contextual keyed child requires generated delivery context.
  field: 'counters',
  // @ts-expect-error A contextual keyed child requires generated delivery context.
  key: 'id',
  // @ts-expect-error A contextual keyed child requires generated delivery context.
  delivery: {},
})

// @ts-expect-error General generated delivery requires an exact key Schema.
GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  readAll: readRooms,
  key: readRoomId,
  read: readRoomCounter,
  writeAt: model => model,
  delivery: { toUpdateContext: model => [model.amount] },
})

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  readAll: readRooms,
  key: readRoomId,
  // @ts-expect-error The key Schema must decode to the selector's key type.
  keySchema: Schema.Number,
  read: readRoomCounter,
  writeAt: model => model,
  delivery: { toUpdateContext: model => [model.amount] },
})

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  // @ts-expect-error The keyed delivery predicate has an incompatible key type.
  field: 'counters',
  // @ts-expect-error The keyed delivery predicate has an incompatible key type.
  key: 'id',
  // @ts-expect-error The keyed delivery predicate has an incompatible key type.
  delivery: {
    when: (_model, _key: number) => true,
    toUpdateContext: model => [model.amount],
  },
})

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  // @ts-expect-error Generated context must match the child update tuple.
  field: 'maybeCounter',
  // @ts-expect-error Generated context must match the child update tuple.
  delivery: {
    toUpdateContext: () => ['wrong'],
  },
})

GeneratedBindingParentDefinition.makeBinding(StatusBlock, {
  // @ts-expect-error A context-free child cannot declare update context.
  field: 'status',
  // @ts-expect-error A context-free child cannot declare update context.
  delivery: {
    toUpdateContext: () => [],
  },
})

const UnregisteredStatusBinding = GeneratedBindingParentDefinition.makeBinding(
  StatusBlock,
  {
    field: 'status',
    placement: 'unregistered-status',
  },
)
const unregisteredGeneratedStep = GeneratedBindingParentDefinition.makeStep(
  () => UnregisteredStatusBinding.requestToggle(),
)
GeneratedBindingParentComposition.makeUpdate({
  // @ts-expect-error Wrapping an operation in Definition.makeStep cannot erase its Binding registration.
  ClickedParent: model => unregisteredGeneratedStep(model),
})

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  // @ts-expect-error Parent Message wrappers are generated from the Binding placement.
  field: 'maybeCounter',
  toParentMessage: () => ParentMessage.ClickedParent(),
  delivery: { toUpdateContext: model => [model.amount] },
})

GeneratedBindingParentDefinition.makeBinding(CounterBlock, {
  // @ts-expect-error Parent Message wrappers are generated from the Binding placement.
  field: 'maybeCounter',
  fromParentMessage: false,
  delivery: { toUpdateContext: model => [model.amount] },
})

const SilentModel = Schema.Struct({ value: Schema.Number })
const GeneratedBindingSilentDefinition = Block.makeDefinition(
  'GeneratedBindingSilent',
  {
    Model: SilentModel,
    Message: Schema.Never,
  },
)
const GeneratedBindingSilentComposition =
  GeneratedBindingSilentDefinition.makeComposition()
const prepareSilentBlock = () =>
  GeneratedBindingSilentComposition.prepareBlock({
    init: GeneratedBindingSilentComposition.makeInit(() => ({
      model: { value: 0 },
    })),
    update: GeneratedBindingSilentComposition.makeUpdate({}),
  })
const SilentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SilentModel,
  typeof prepareSilentBlock
> = Block.assemble(prepareSilentBlock)
const GeneratedBindingSilentParentDefinition = Block.makeDefinition(
  'GeneratedBindingSilentParent',
  {
    Model: Schema.Struct({ silent: SilentModel }),
    Message: Schema.Never,
  },
)
GeneratedBindingSilentParentDefinition.makeBinding(SilentBlock, {
  // @ts-expect-error A Message-free child cannot configure generated delivery.
  field: 'silent',
  // @ts-expect-error A Message-free child cannot configure generated delivery.
  delivery: {},
})
