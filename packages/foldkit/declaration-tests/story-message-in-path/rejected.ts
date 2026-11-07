import { Schema } from 'effect'
import { Block } from 'foldkit'
import * as Story from 'foldkit/story'

import {
  DirectLeafBinding,
  LeafBlock,
  LeafMessage,
  LeavesBinding,
  MiddleBinding,
} from './accepted.js'

Story.messageIn(
  // @ts-expect-error A Binding path must be nonempty.
  [],
  LeafMessage.UpdatedCount({ count: 1 }),
)

Story.messageIn(
  // @ts-expect-error A keyed Binding path element requires its exact key selector.
  [MiddleBinding, LeavesBinding],
  LeafMessage.UpdatedCount({ count: 1 }),
)

Story.messageIn(
  // @ts-expect-error A keyed Binding path element requires its decoded key type.
  [MiddleBinding, { binding: LeavesBinding, key: 1 }],
  LeafMessage.UpdatedCount({ count: 1 }),
)

Story.messageIn(
  // @ts-expect-error A static Binding path element must not carry an occurrence key.
  [{ binding: DirectLeafBinding, key: 'first' }],
  LeafMessage.UpdatedCount({ count: 1 }),
)

const middle = MiddleBinding
const leaves = LeavesBinding
// @ts-expect-error The delivered Message must belong to the path's leaf Block.
Story.messageIn([middle, { binding: leaves, key: 'first' }], { _tag: 'Wrong' })

Story.messageIn(
  // @ts-expect-error Every next Binding must belong to the preceding child Block.
  [DirectLeafBinding, { binding: LeavesBinding, key: 'first' }],
  LeafMessage.UpdatedCount({ count: 1 }),
)

const ForeignMiddleKey = Symbol('StoryMessageInPathDeclarationForeignMiddle')
const ForeignMiddleBlock = Block.make(
  'StoryMessageInPathDeclarationForeignMiddle',
  {
    key: ForeignMiddleKey,
    Model: Schema.Struct({
      leaves: Schema.Record(
        Schema.String,
        Schema.Struct({ count: Schema.Number }),
      ),
    }),
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
const ForeignLeavesBinding = ForeignMiddleBlock.makeRecordBinding(LeafBlock, {
  field: 'leaves',
})

Story.messageIn(
  // @ts-expect-error A same-shaped foreign parent does not own the nested Binding.
  [MiddleBinding, { binding: ForeignLeavesBinding, key: 'first' }],
  LeafMessage.UpdatedCount({ count: 1 }),
)
