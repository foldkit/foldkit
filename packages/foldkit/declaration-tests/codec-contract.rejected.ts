import { Schema } from 'effect'
import * as Block from 'foldkit/block'

import {
  ChildBlock,
  Message,
  Model,
  ParentModel,
  ServiceText,
} from './codec-contract.accepted.js'

const ServiceModel = Schema.Struct({ value: ServiceText })
const ServiceMessage = Schema.Struct({
  _tag: Schema.Literal('ChangedServiceValue'),
  value: ServiceText,
})

const BadUnifiedModelKey = Symbol('BadUnifiedModel')
Block.make('BadUnifiedModel', {
  key: BadUnifiedModelKey,
  // @ts-expect-error A Block Model Codec must not require decoding or encoding Services.
  Model: ServiceModel,
  Message,
  InitArgs: Schema.Tuple([]),
})

const BadUnifiedMessageKey = Symbol('BadUnifiedMessage')
Block.make('BadUnifiedMessage', {
  key: BadUnifiedMessageKey,
  Model,
  // @ts-expect-error A local Block Message Codec must not require decoding or encoding Services.
  Message: ServiceMessage,
  InitArgs: Schema.Tuple([]),
})

Block.makeDefinition('BadNativeModel', {
  // @ts-expect-error Native Definition Models must be self-contained Codecs.
  Model: ServiceModel,
  Message,
})

Block.makeDefinition('BadNativeMessage', {
  Model,
  // @ts-expect-error Native Definition Messages must be self-contained Codecs.
  Message: ServiceMessage,
})

const RetiredCodecKey = Symbol('RetiredCodec')
// @ts-expect-error Explicit codec Service declarations have been removed.
Block.make('RetiredCodec', {
  key: RetiredCodecKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  codec: { decoding: [], encoding: [] },
})

const ServiceChildKey = Symbol('ServiceChild')
const ServiceChild = Block.make('ServiceChild', {
  key: ServiceChildKey,
  Model,
  // @ts-expect-error A child local Message Codec must not require Services.
  Message: ServiceMessage,
  InitArgs: Schema.Tuple([]),
})

const ServiceChildParentKey = Symbol('ServiceChildParent')
const ServiceChildParent = Block.make('ServiceChildParent', {
  key: ServiceChildParentKey,
  Model: ParentModel,
  Message,
  InitArgs: Schema.Tuple([]),
})
// @ts-expect-error A Service-dependent child cannot enter a generated dispatch graph.
const ServiceChildBinding = ServiceChildParent.makeRequiredFieldBinding(
  ServiceChild,
  {
    field: 'child',
  },
)
void ServiceChildBinding

const ServiceKeyParentKey = Symbol('ServiceKeyParent')
const ServiceKeyParent = Block.make('ServiceKeyParent', {
  key: ServiceKeyParentKey,
  Model: ParentModel,
  Message,
  InitArgs: Schema.Tuple([]),
})
const ServiceKeyBinding = ServiceKeyParent.makeCustomKeyedBinding(ChildBlock, {
  placement: 'serviceKeyChildren',
  readAll: model => model.children,
  key: child => child.id,
  keySchema: ServiceText,
  read: child => child,
  writeAt: (model, childId, nextChild) =>
    ParentModel.make({
      ...model,
      children: model.children.map(child =>
        child.id === childId ? nextChild : child,
      ),
    }),
})
// @ts-expect-error Generated keyed dispatch must retain and reject key Schema Services.
ServiceKeyParent.makeComposition({ bindings: [ServiceKeyBinding] })
