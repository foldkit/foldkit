import { Context, Effect, Schema, SchemaTransformation } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({
  Changed: { value: Schema.String },
  Cleared: {},
})
const DispatchContext = Schema.Struct({ prefix: Schema.String })

export const ContractContextKey = Symbol('ContractContext')
export const ContextDefinition = Contracted.makeDefinition('ContractContext', {
  key: ContractContextKey,
  Model,
  Message,
  Init: Schema.Tuple([Schema.String]),
  Context: Schema.Tuple([DispatchContext]),
  operations: { change: Message.Changed, clear: Message.Cleared },
})
const ContextComposition = ContextDefinition.makeComposition()
export const ContextBlock = ContextDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ContextComposition.makeInit(value => ({ model: { value } })),
    update: ContextComposition.makeUpdate.withContext(context => ({
      Changed: (model, { value }) => ({
        model: modifyFields(model, {
          value: () => `${context.prefix}${value}`,
        }),
      }),
      Cleared: ContextDefinition.makeFieldsStep(() => ({ value: () => '' })),
    })),
  }),
)

Effect.gen(function* () {
  const block = yield* ContextDefinition.contract.get
  const initial = block.init('')
  block.operations.change(
    initial.model,
    { value: 'Hello' },
    { prefix: 'One: ' },
  )
  block.operations.clear(initial.model, { prefix: 'One: ' })
  // @ts-expect-error Empty operation payloads do not introduce a placeholder before Context.
  block.operations.clear(initial.model, {}, { prefix: 'One: ' })
  // @ts-expect-error Public operations retain required dispatch Context.
  block.operations.change(initial.model, { value: 'Hello' })
  // @ts-expect-error Public operations retain the Context Schema type.
  block.operations.clear(initial.model, { prefix: 1 })
  block.update(initial.model, Message.Cleared(), { prefix: '' })
  block.update(Message.Cleared())(initial.model, { prefix: '' })
})

export class Decode extends Context.Service<
  Decode,
  Readonly<{ prefix: string }>
>()('ContractCodecDecoder') {}
export class Encode extends Context.Service<
  Encode,
  Readonly<{ prefix: string }>
>()('ContractCodecEncoder') {}

const CodedText = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.map(Decode, service => `${service.prefix}${value}`),
      encode: value =>
        Effect.map(Encode, service => `${service.prefix}${value}`),
    }),
  ),
)
const CodecMessage = defineMessageUnion({ Updated: { value: CodedText } })
export const CodecChildKey = Symbol('CodecChild')
export const CodecChildDefinition = Contracted.makeDefinition('CodecChild', {
  key: CodecChildKey,
  Model,
  Message: CodecMessage,
  Init: Schema.Tuple([]),
})
const CodecChildComposition = CodecChildDefinition.makeComposition()
export const CodecChildBlock = CodecChildDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: CodecChildComposition.makeInit(() => ({ model: { value: '' } })),
    update: CodecChildComposition.makeUpdate({
      Updated: (model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      }),
    }),
  }),
)

const ParentModel = Schema.Struct({
  child: CodecChildDefinition.contract.Model,
})
const ParentMessage = defineMessageUnion({ Clicked: {} })
const CodecParentMissingKey = Symbol('CodecParentMissing')
const BadParentDefinition = Contracted.makeDefinition('CodecParentMissing', {
  key: CodecParentMissingKey,
  Model: ParentModel,
  Message: ParentMessage,
  Init: Schema.Tuple([]),
})
const BadBinding = BadParentDefinition.makeBinding(
  CodecChildDefinition.contract,
  { field: 'child', init: { contextToArgs: () => [] } },
)
const BadComposition = BadParentDefinition.makeComposition({
  bindings: [BadBinding],
})
// @ts-expect-error Descendant dispatch Codec Services cannot be silently hidden.
BadParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* BadBinding
    return {
      children: [child],
      init: BadComposition.makeInit(() => ({ model: {} })),
      update: BadComposition.makeUpdate({
        Clicked: BadParentDefinition.makeNoopStep(),
      }),
    }
  }),
)

export const CodecParentKey = Symbol('CodecParent')
export const CodecParentDefinition = Contracted.makeDefinition('CodecParent', {
  key: CodecParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  Init: Schema.Tuple([]),
  codec: { decoding: [Decode], encoding: [Encode] },
})
export const CodecBinding = CodecParentDefinition.makeBinding(
  CodecChildDefinition.contract,
  { field: 'child', init: { contextToArgs: () => [] } },
)
const CodecParentComposition = CodecParentDefinition.makeComposition({
  bindings: [CodecBinding],
})
export const CodecParentBlock = CodecParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* CodecBinding
    return {
      children: [child],
      init: CodecParentComposition.makeInit(() => ({ model: {} })),
      update: CodecParentComposition.makeUpdate({
        Clicked: CodecParentDefinition.makeNoopStep(),
      }),
    }
  }),
)

type Assert<Value extends true> = Value
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
export type DecodePreserved = Assert<
  Equal<
    Contracted.ExecutableOf<
      typeof CodecParentBlock
    >['Message']['DecodingServices'],
    Decode
  >
>
export type EncodePreserved = Assert<
  Equal<
    Contracted.ExecutableOf<
      typeof CodecParentBlock
    >['Message']['EncodingServices'],
    Encode
  >
>
