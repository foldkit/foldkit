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

declare const ServiceRoomId: Schema.Codec<
  string,
  number,
  'RoomIdDecode',
  'RoomIdEncode'
>

// @ts-expect-error A contextual accessor requires generated delivery context.
GeneratedBindingParentDefinition.makeCustomBinding(CounterBlock, {
  read: model => model.selected,
  write: (model, nextCounter) =>
    modifyFields(model, { selected: () => Option.some(nextCounter) }),
})

const ServiceRoomBinding =
  GeneratedBindingParentDefinition.makeCustomKeyedBinding(CounterBlock, {
    readAll: readRooms,
    key: readRoomId,
    keySchema: ServiceRoomId,
    read: readRoomCounter,
    writeAt: model => model,
    delivery: { toUpdateContext: model => [model.amount] },
  })
// @ts-expect-error Generated child envelope key serialization must not require Services.
GeneratedBindingParentDefinition.makeComposition({
  bindings: [ServiceRoomBinding],
})

GeneratedBindingParentDefinition.makeKeyedArrayBinding(CounterBlock, {
  field: 'counters',
  key: 'id',
  // @ts-expect-error A contextual keyed child requires generated delivery context.
  delivery: {},
})

// @ts-expect-error General generated delivery requires an exact key Schema.
GeneratedBindingParentDefinition.makeCustomKeyedBinding(CounterBlock, {
  readAll: readRooms,
  key: readRoomId,
  read: readRoomCounter,
  writeAt: model => model,
  delivery: { toUpdateContext: model => [model.amount] },
})

GeneratedBindingParentDefinition.makeCustomKeyedBinding(CounterBlock, {
  readAll: readRooms,
  // @ts-expect-error The key Schema must decode to the selector's key type.
  key: readRoomId,
  keySchema: Schema.Number,
  read: readRoomCounter,
  writeAt: model => model,
  delivery: { toUpdateContext: model => [model.amount] },
})

GeneratedBindingParentDefinition.makeKeyedArrayBinding(CounterBlock, {
  field: 'counters',
  key: 'id',
  delivery: {
    // @ts-expect-error The keyed delivery predicate has an incompatible key type.
    when: (_model, _key: number) => true,
    toUpdateContext: model => [model.amount],
  },
})

GeneratedBindingParentDefinition.makeOptionalFieldBinding(CounterBlock, {
  field: 'maybeCounter',
  delivery: {
    // @ts-expect-error Generated context must match the child update tuple.
    toUpdateContext: () => ['wrong'],
  },
})

GeneratedBindingParentDefinition.makeRequiredFieldBinding(StatusBlock, {
  field: 'status',
  delivery: {
    // @ts-expect-error A context-free child cannot declare update context.
    toUpdateContext: () => [],
  },
})

const UnregisteredStatusBinding =
  GeneratedBindingParentDefinition.makeRequiredFieldBinding(StatusBlock, {
    field: 'status',
    placement: 'unregistered-status',
  })
const unregisteredGenerated = GeneratedBindingParentDefinition.makeStep(() =>
  UnregisteredStatusBinding.requestToggle(),
)
GeneratedBindingParentComposition.makeUpdate({
  // @ts-expect-error Wrapping an operation in Definition.makeStep cannot erase its Binding registration.
  ClickedParent: model => unregisteredGenerated(model),
})

// @ts-expect-error Parent Message wrappers are generated from the Binding placement.
GeneratedBindingParentDefinition.makeOptionalFieldBinding(CounterBlock, {
  field: 'maybeCounter',
  toParentMessage: () => ParentMessage.ClickedParent(),
  delivery: { toUpdateContext: model => [model.amount] },
})

// @ts-expect-error Parent Message wrappers are generated from the Binding placement.
GeneratedBindingParentDefinition.makeOptionalFieldBinding(CounterBlock, {
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
// @ts-expect-error A Message-free child cannot configure generated delivery.
GeneratedBindingSilentParentDefinition.makeRequiredFieldBinding(SilentBlock, {
  field: 'silent',
  delivery: {},
})
