import { Context, Effect, Schema, SchemaTransformation } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export class CodecService extends Context.Service<
  CodecService,
  Readonly<{ transform: (value: string) => string }>
>()('SerializationContract/CodecService') {}

export const ServiceText = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.map(CodecService, service => service.transform(value)),
      encode: value =>
        Effect.map(CodecService, service => service.transform(value)),
    }),
  ),
)

export const Model = Schema.Struct({
  id: Schema.String,
  maybeSavedAt: Schema.Option(Schema.Date),
  count: Schema.NumberFromString,
})
export const Message = defineMessageUnion({
  ChangedCount: { count: Schema.NumberFromString },
  SavedAt: { savedAt: Schema.Date },
})
export const InMessage = defineInMessageUnion({
  RequestedImport: { value: ServiceText },
})
export const OutMessage = defineMessageUnion({
  CompletedExport: { value: ServiceText },
})
export const ChildInitContext = Schema.Struct({ value: ServiceText })
export const ConstructionContext = Schema.Tuple([ServiceText])

export const ChildKey = Symbol('SerializationChild')
export const ChildBlock = Block.make('SerializationChild', {
  key: ChildKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})

export const ParentModel = Schema.Struct({
  child: ChildBlock.Model,
  children: Schema.Array(ChildBlock.Model),
})
export const ParentKey = Symbol('SerializationParent')
export const ParentBlock = Block.make('SerializationParent', {
  key: ParentKey,
  Model: ParentModel,
  Message,
  InMessage,
  OutMessage,
  ChildInitContext,
  Context: ConstructionContext,
  InitArgs: Schema.Tuple([]),
})

export const TransformPayload = ParentBlock.makeCommand('TransformPayload', {
  args: { value: ServiceText },
  messages: [Message.ChangedCount],
})

export const ChildBinding = ParentBlock.makeRequiredFieldBinding(ChildBlock, {
  field: 'child',
})
export const ChildrenBinding = ParentBlock.makeCustomKeyedBinding(ChildBlock, {
  placement: 'children',
  readAll: model => model.children,
  key: child => child.id,
  keySchema: Schema.String,
  read: child => child,
  writeAt: (model, childId, nextChild) =>
    ParentModel.make({
      ...model,
      children: model.children.map(child =>
        child.id === childId ? nextChild : child,
      ),
    }),
})
export const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildBinding, ChildrenBinding],
})

export const NativeDefinition = Block.makeDefinition('SerializationNative', {
  Model,
  Message,
  OutMessage,
  ChildInitContext,
})
export const NativeTransformPayload = NativeDefinition.makeCommand(
  'TransformPayload',
  {
    args: { value: ServiceText },
    messages: [Message.ChangedCount],
  },
)
export const NativeComposition = NativeDefinition.makeComposition()
