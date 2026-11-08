import { Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import * as Story from 'foldkit/story'

import {
  DirectLeafBinding,
  LeafBlock,
  LeafMessage,
  LeavesBinding,
  MiddleBinding,
  directLeafSubscriptions,
  leafSubscriptions,
} from './accepted.js'

// @ts-expect-error Story groups accept steps, not arbitrary primitive values.
Story.steps(123)
// @ts-expect-error An object without a Story step contract is not a step.
Story.steps({})

Story.messageIn(
  // @ts-expect-error A Binding path must be nonempty.
  [],
  LeafMessage.UpdatedCount({ count: 1 }),
)

Story.Subscription.emit(
  leafSubscriptions.counts,
  // @ts-expect-error Subscription delivery accepts the declared decoded payload.
  { _tag: 'UpdatedCount', count: '1' },
)

Story.Subscription.emit(
  leafSubscriptions.silent,
  // @ts-expect-error A silent Subscription has no Message payload to emit.
  LeafMessage.UpdatedCount({ count: 1 }),
)

// @ts-expect-error Direct graph-backed emit is unavailable to an update-only Story.
const updateOnlyStep: Story.StoryStep<
  typeof LeafBlock.Model.Type,
  typeof LeafMessage.Type
> = Story.Subscription.emit(
  leafSubscriptions.counts,
  LeafMessage.UpdatedCount({ count: 1 }),
)
void updateOnlyStep

// @ts-expect-error The Subscription source owner must match the selected Binding child.
// oxfmt-ignore
Story.Subscription.at(DirectLeafBinding, leafSubscriptions.counts)

// @ts-expect-error The Subscription source owner must match the selected Binding child.
// oxfmt-ignore
Story.Subscription.at(LeavesBinding, 'first', directLeafSubscriptions.counts)

const SameNameForeignLeafKey = Symbol(
  'StoryMessageInPathDeclarationSameNameForeignLeaf',
)
const SameNameForeignLeafBlock = Block.make(
  'StoryMessageInPathDeclarationLeaf',
  {
    key: SameNameForeignLeafKey,
    Model: LeafBlock.Model,
    Message: LeafMessage,
    InitArgs: Schema.Tuple([]),
  },
)
const sameNameForeignLeafSubscriptions =
  SameNameForeignLeafBlock.makeSubscriptions(entry => ({
    counts: entry('Counts', {
      messages: [LeafMessage.UpdatedCount],
      handler: function* () {
        return () => Stream.never
      },
    }),
  }))

// @ts-expect-error Equal displayed IDs do not erase the distinct nominal Block owner.
// oxfmt-ignore
Story.Subscription.at(LeavesBinding, 'first', sameNameForeignLeafSubscriptions.counts)

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
