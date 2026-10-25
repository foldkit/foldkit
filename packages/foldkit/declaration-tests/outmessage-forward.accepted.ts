import { Layer, Schema } from 'effect'
import { Block, Message } from 'foldkit'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const Choice = Schema.Literals(['Apple', 'Pear'])
export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({ RequestedClose: {} })
export const ChildOutMessage = Message.defineMessageUnion({
  Selected: { value: Choice },
  Closed: {},
})
const ChildDefinition = Block.makeDefinition('ForwardDeclarationChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      RequestedClose: model => ({ model }),
    }),
    operations: { requestClose: ChildMessage.RequestedClose },
    EffectsLayer: Layer.empty,
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const ParentModel = Schema.Struct({ choice: Choice })
export const ParentMessage = Message.defineMessageUnion({ RequestedReset: {} })
export const ParentOutMessage = Message.defineMessageUnion({
  Chose: { value: Choice },
  Dismissed: {},
})
export const ForeignOutMessage = Message.defineMessageUnion({ Escaped: {} })
export const ParentDefinition = Block.makeDefinition(
  'ForwardDeclarationParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  },
)

export const forwardChildOutMessage = ParentDefinition.makeOutMessageForward(
  ChildBlock,
  {
    Selected: ({ value }) => ParentOutMessage.Chose({ value }),
    Closed: () => undefined,
  },
)

export const DefinitionWithoutOutMessage = Block.makeDefinition(
  'ForwardDeclarationParentWithoutOutMessage',
  { Model: ParentModel, Message: ParentMessage },
)

export type ForwardInput = Expect<
  Equal<
    Parameters<typeof forwardChildOutMessage>[0],
    typeof ChildOutMessage.Type
  >
>
export type ForwardOutput = Expect<
  Equal<
    ReturnType<typeof forwardChildOutMessage>,
    typeof ParentOutMessage.Type | undefined
  >
>
