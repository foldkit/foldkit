import { Context, Effect, Schema, SchemaTransformation } from 'effect'
import { Block, Message } from 'foldkit'

import { ChildComposition, init, update } from './schema-boundary-block.js'
import {
  ChildBinding,
  ParentDefinition,
} from './schema-boundary-parent-composition.js'
import * as Child from './schema-boundary-public.js'

class SerializationService extends Context.Service<
  SerializationService,
  Readonly<{ prefix: string }>
>()('PublicModelBoundary/SerializationService') {}

const ServiceText = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.map(
          SerializationService,
          service => `${service.prefix}${value}`,
        ),
      encode: Effect.succeed,
    }),
  ),
)
const ServiceModel = Schema.Struct({ value: ServiceText })
const ServiceMessage = Message.defineMessageUnion({
  ChangedValue: { value: ServiceText },
})

Block.makeDefinition('PublicModelServiceModel', {
  // @ts-expect-error Block Model serialization must not require Services.
  Model: ServiceModel,
  Message: Schema.Never,
})

Block.makeDefinition('PublicModelServiceMessage', {
  Model: Schema.Struct({ value: Schema.String }),
  // @ts-expect-error Block Message serialization must not require Services.
  Message: ServiceMessage,
})

// @ts-expect-error A plain number does not satisfy the branded Model field.
Child.Model.make({ count: 0 })
// @ts-expect-error Exposed operation arguments stay exact.
ChildBinding.load('Other')
ParentDefinition.makeComposition().makeUpdate({
  RequestedLoad: model =>
    // @ts-expect-error The parent cannot use an unregistered child Step.
    ChildBinding.load('Primary')(model),
})
// @ts-expect-error The completed producer still requires the Command handler.
ChildComposition.prepareBlock({ init, update })

const WrongFieldDefinition = Block.makeDefinition('PublicModelWrongField', {
  Model: Schema.Struct({ child: Schema.String }),
  Message: Schema.Never,
})
// @ts-expect-error An early Schema export does not permit an incompatible child field.
WrongFieldDefinition.makeRequiredFieldBinding(Child.ChildBlock, {
  field: 'child',
})
