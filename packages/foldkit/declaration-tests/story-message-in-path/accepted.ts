import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'

export const LeafMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})
const LeafKey = Symbol('StoryMessageInPathDeclarationLeaf')
export const LeafBlock = Block.make('StoryMessageInPathDeclarationLeaf', {
  key: LeafKey,
  Model: Schema.Struct({ count: Schema.Number }),
  Message: LeafMessage,
  InitArgs: Schema.Tuple([]),
})

const MiddleModel = Schema.Struct({
  leaves: Schema.Record(Schema.String, LeafBlock.Model),
})
const MiddleKey = Symbol('StoryMessageInPathDeclarationMiddle')
export const MiddleBlock = Block.make('StoryMessageInPathDeclarationMiddle', {
  key: MiddleKey,
  Model: MiddleModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
export const LeavesBinding = MiddleBlock.makeRecordBinding(LeafBlock, {
  field: 'leaves',
})
export const MiddleComposition = MiddleBlock.makeComposition({
  bindings: [LeavesBinding],
})

const RootKey = Symbol('StoryMessageInPathDeclarationRoot')
export const RootBlock = Block.make('StoryMessageInPathDeclarationRoot', {
  key: RootKey,
  Model: Schema.Struct({ middle: MiddleModel }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
export const MiddleBinding = RootBlock.makeRequiredFieldBinding(MiddleBlock, {
  field: 'middle',
})
export const RootComposition = RootBlock.makeComposition({
  bindings: [MiddleBinding],
})

const DirectLeafKey = Symbol('StoryMessageInPathDeclarationDirectLeaf')
export const DirectLeafBlock = Block.make(
  'StoryMessageInPathDeclarationDirectLeaf',
  {
    key: DirectLeafKey,
    Model: Schema.Struct({ count: Schema.Number }),
    Message: LeafMessage,
    InitArgs: Schema.Tuple([]),
  },
)
const DirectRootKey = Symbol('StoryMessageInPathDeclarationDirectRoot')
export const DirectRootBlock = Block.make(
  'StoryMessageInPathDeclarationDirectRoot',
  {
    key: DirectRootKey,
    Model: Schema.Struct({ child: DirectLeafBlock.Model }),
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
export const DirectLeafBinding = DirectRootBlock.makeRequiredFieldBinding(
  DirectLeafBlock,
  {
    field: 'child',
  },
)
export const DirectRootComposition = DirectRootBlock.makeComposition({
  bindings: [DirectLeafBinding],
})

export const nestedLeafDelivery = Story.messageIn(
  [MiddleBinding, { binding: LeavesBinding, key: 'first' }],
  LeafMessage.UpdatedCount({ count: 1 }),
)
export const oneElementPathDelivery = Story.messageIn(
  [DirectLeafBinding],
  LeafMessage.UpdatedCount({ count: 2 }),
)
export const directDelivery = Story.messageIn(
  DirectLeafBinding,
  LeafMessage.UpdatedCount({ count: 3 }),
)
export const keyedDelivery = Story.messageIn(
  LeavesBinding,
  'first',
  LeafMessage.UpdatedCount({ count: 4 }),
)
