import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { __commandMatches } from 'foldkit/test'
import * as Update from 'foldkit/update'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DragAndDropBlock, DragState } from './block.js'
import { FocusItem, resolveKeyboardMove, settleFocus } from './test.js'

const ParentModel = Schema.Struct({
  left: DragAndDropBlock.Model,
  right: DragAndDropBlock.Model,
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  RequestedLeftMove: {},
  RequestedRightMove: {},
  RequestedBothMoves: {},
  RequestedLeftDrop: {},
})
type ParentMessage = typeof ParentMessage.Type

const DragAndDropTestParentDefinition = Block.makeDefinition(
  'DragAndDropTestParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

const foldDragAndDropOutMessage =
  DragAndDropTestParentDefinition.makeOutMessageFold(DragAndDropBlock, {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  })

const LeftBinding = DragAndDropTestParentDefinition.makeBinding(
  DragAndDropBlock,
  {
    field: 'left',
    init: false,
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const RightBinding = DragAndDropTestParentDefinition.makeBinding(
  DragAndDropBlock,
  {
    field: 'right',
    init: false,
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const DragAndDropTestParentComposition =
  DragAndDropTestParentDefinition.makeComposition({
    bindings: [LeftBinding, RightBinding],
  })

const update = DragAndDropTestParentComposition.makeUpdate({
  RequestedLeftMove: model =>
    LeftBinding.fold(
      model,
      DragAndDropBlock.Message.PressedArrowKey({ direction: 'Right' }),
    ),
  RequestedRightMove: model =>
    RightBinding.fold(
      model,
      DragAndDropBlock.Message.PressedArrowKey({ direction: 'Right' }),
    ),
  RequestedBothMoves: model =>
    Update.combineSteps(model, [
      stepModel =>
        LeftBinding.fold(
          stepModel,
          DragAndDropBlock.Message.PressedArrowKey({ direction: 'Right' }),
        ),
      stepModel =>
        RightBinding.fold(
          stepModel,
          DragAndDropBlock.Message.PressedArrowKey({ direction: 'Right' }),
        ),
    ]),
  RequestedLeftDrop: model =>
    LeftBinding.fold(model, DragAndDropBlock.Message.ConfirmedKeyboardDrop()),
})

const keyboardDragging = (id: string, itemId: string) => ({
  ...DragAndDropBlock.init({ id }).model,
  dragState: DragState.KeyboardDragging({
    itemId,
    sourceContainerId: `${id}-source`,
    sourceIndex: 0,
    targetContainerId: `${id}-source`,
    targetIndex: 0,
  }),
})

const initialModel: ParentModel = {
  left: keyboardDragging('left', 'left-item'),
  right: keyboardDragging('right', 'right-item'),
}

describe('DragAndDrop.test Binding selection', () => {
  it('rejects a key without a Binding at runtime', () => {
    expect(() =>
      Reflect.apply(settleFocus, undefined, [
        { itemId: 'left-item', key: 'left' },
      ]),
    ).toThrow('require a Binding when key is provided')

    expect(() =>
      Reflect.apply(resolveKeyboardMove, undefined, [
        {
          itemId: 'left-item',
          targetContainerId: 'left-target',
          targetIndex: 2,
          key: 'left',
        },
      ]),
    ).toThrow('require a Binding when key is provided')
  })

  it('settles focus for the selected embedded Binding', () => {
    Story.story(
      update,
      Story.given(initialModel),
      Story.message(ParentMessage.RequestedLeftDrop()),
      settleFocus({ binding: LeftBinding, itemId: 'left-item' }),
    )
  })

  it('resolves the selected embedded Binding and leaves its sibling unchanged', () => {
    Story.story(
      update,
      Story.given(initialModel),
      Story.message(ParentMessage.RequestedLeftMove()),
      resolveKeyboardMove({
        binding: LeftBinding,
        itemId: 'left-item',
        targetContainerId: 'left-target',
        targetIndex: 2,
      }),
      Story.model(model => {
        expect(model.left.dragState).toEqual(
          DragState.KeyboardDragging({
            itemId: 'left-item',
            sourceContainerId: 'left-source',
            sourceIndex: 0,
            targetContainerId: 'left-target',
            targetIndex: 2,
          }),
        )
        expect(model.right).toBe(initialModel.right)
      }),
    )
  })

  it('rejects a sibling Binding even when it owns the same Command Definition', () => {
    expect(() =>
      Story.story(
        update,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedLeftMove()),
        resolveKeyboardMove({
          binding: RightBinding,
          itemId: 'left-item',
          targetContainerId: 'left-target',
          targetIndex: 2,
        }),
      ),
    ).toThrow('could not find a pending keyboard move')
  })

  it('rejects a scoped move whose result omits its focus Command', () => {
    const updateWithoutFocus = (model: ParentModel, message: ParentMessage) => {
      const parentUpdate = update(model, message)

      return {
        ...parentUpdate,
        commands: Array.filter(
          parentUpdate.commands ?? [],
          command =>
            !__commandMatches(FocusItem({ itemId: 'left-item' }), command),
        ),
      }
    }

    expect(() =>
      Story.story(
        updateWithoutFocus,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedLeftMove()),
        resolveKeyboardMove({
          binding: LeftBinding,
          itemId: 'left-item',
          targetContainerId: 'left-target',
          targetIndex: 2,
        }),
      ),
    ).toThrow('no matching pending Command was found')
  })

  it('resolves one of two identical pending moves by Binding', () => {
    const sharedItemModel: ParentModel = {
      left: keyboardDragging('left', 'shared-item'),
      right: keyboardDragging('right', 'shared-item'),
    }

    Story.story(
      update,
      Story.given(sharedItemModel),
      Story.message(ParentMessage.RequestedBothMoves()),
      resolveKeyboardMove({
        binding: RightBinding,
        itemId: 'shared-item',
        targetContainerId: 'right-target',
        targetIndex: 3,
      }),
      resolveKeyboardMove({
        binding: LeftBinding,
        itemId: 'shared-item',
        targetContainerId: 'left-target',
        targetIndex: 1,
      }),
    )
  })
})

const prepare = () =>
  DragAndDropTestParentComposition.prepareBlock({
    init: () => ({ model: initialModel }),
    update,
  })
const NestedParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepare
> = Block.assemble(prepare)

const NestedSlot = Schema.Struct({
  key: Schema.String,
  parent: ParentModel,
})

const NestedModel = Schema.Struct({ slots: Schema.Array(NestedSlot) })
type NestedModel = typeof NestedModel.Type

const NestedMessage = defineMessageUnion({ RequestedBothMoves: {} })

const NestedDragAndDropTestParentDefinition = Block.makeDefinition(
  'NestedDragAndDropTestParent',
  {
    Model: NestedModel,
    Message: NestedMessage,
  },
)

const NestedBinding = NestedDragAndDropTestParentDefinition.makeBinding(
  NestedParentBlock,
  {
    placement: 'parents',
    keySchema: Schema.String,
    readAll: model => model.slots,
    key: slot => slot.key,
    read: slot => slot.parent,
    writeAt: (model, key, nextParent) =>
      modifyFields(model, {
        slots: Array.map(slot =>
          slot.key === key
            ? NestedSlot.make({ key, parent: nextParent })
            : slot,
        ),
      }),
  },
)

const NestedDragAndDropTestParentComposition =
  NestedDragAndDropTestParentDefinition.makeComposition({
    bindings: [NestedBinding],
  })

const nestedUpdate = NestedDragAndDropTestParentComposition.makeUpdate({
  RequestedBothMoves: model =>
    Update.combineSteps(model, [
      stepModel =>
        NestedBinding.fold(
          stepModel,
          'first',
          ParentMessage.RequestedLeftMove(),
        ),
      stepModel =>
        NestedBinding.fold(
          stepModel,
          'second',
          ParentMessage.RequestedLeftMove(),
        ),
    ]),
})

const nestedInitialModel: NestedModel = {
  slots: [
    NestedSlot.make({ key: 'first', parent: initialModel }),
    NestedSlot.make({ key: 'second', parent: initialModel }),
  ],
}

describe('DragAndDrop.test nested ancestor selection', () => {
  it('fails before resolving when an ancestor Binding occurrence is ambiguous', () => {
    expect(() =>
      Story.story(
        nestedUpdate,
        Story.given(nestedInitialModel),
        Story.message(NestedMessage.RequestedBothMoves()),
        resolveKeyboardMove({
          binding: LeftBinding,
          itemId: 'left-item',
          targetContainerId: 'left-target',
          targetIndex: 2,
        }),
      ),
    ).toThrow('Isolate one ancestor occurrence in this Story')
  })
})

const KeyedSlot = Schema.Struct({
  key: Schema.String,
  dragAndDrop: DragAndDropBlock.Model,
})

const KeyedParentModel = Schema.Struct({ slots: Schema.Array(KeyedSlot) })
type KeyedParentModel = typeof KeyedParentModel.Type

const KeyedParentMessage = defineMessageUnion({
  RequestedMove: { key: Schema.String },
})

const KeyedDragAndDropTestParentDefinition = Block.makeDefinition(
  'KeyedDragAndDropTestParent',
  {
    Model: KeyedParentModel,
    Message: KeyedParentMessage,
  },
)

const foldKeyedDragAndDropOutMessage =
  KeyedDragAndDropTestParentDefinition.makeOutMessageFold(DragAndDropBlock, {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  })

const KeyedBinding = KeyedDragAndDropTestParentDefinition.makeBinding(
  DragAndDropBlock,
  {
    placement: 'boards',
    keySchema: Schema.String,
    readAll: model => model.slots,
    key: slot => slot.key,
    read: slot => slot.dragAndDrop,
    writeAt: (model, key, nextDragAndDrop) =>
      modifyFields(model, {
        slots: Array.map(slot =>
          slot.key === key
            ? KeyedSlot.make({ key, dragAndDrop: nextDragAndDrop })
            : slot,
        ),
      }),
  },
).withOutMessagePolicy({
  fold: (_key, outMessage) => foldKeyedDragAndDropOutMessage(outMessage),
})

const KeyedDragAndDropTestParentComposition =
  KeyedDragAndDropTestParentDefinition.makeComposition({
    bindings: [KeyedBinding],
  })

const keyedUpdate = KeyedDragAndDropTestParentComposition.makeUpdate({
  RequestedMove: (model, { key }) =>
    KeyedBinding.fold(
      model,
      key,
      DragAndDropBlock.Message.PressedArrowKey({ direction: 'Down' }),
    ),
})

const keyedInitialModel: KeyedParentModel = {
  slots: [
    KeyedSlot.make({
      key: 'first',
      dragAndDrop: keyboardDragging('first', 'first-item'),
    }),
    KeyedSlot.make({
      key: 'second',
      dragAndDrop: keyboardDragging('second', 'second-item'),
    }),
  ],
}

describe('DragAndDrop.test keyed Binding selection', () => {
  it('resolves the selected keyed occurrence', () => {
    Story.story(
      keyedUpdate,
      Story.given(keyedInitialModel),
      Story.message(KeyedParentMessage.RequestedMove({ key: 'second' })),
      resolveKeyboardMove({
        binding: KeyedBinding,
        key: 'second',
        itemId: 'second-item',
        targetContainerId: 'second-target',
        targetIndex: 4,
      }),
      Story.model(model => {
        expect(model.slots).toHaveLength(2)
        expect(
          Option.getOrThrow(Array.get(model.slots, 1)).dragAndDrop.dragState,
        ).toEqual(
          DragState.KeyboardDragging({
            itemId: 'second-item',
            sourceContainerId: 'second-source',
            sourceIndex: 0,
            targetContainerId: 'second-target',
            targetIndex: 4,
          }),
        )
      }),
    )
  })

  it('rejects the wrong keyed occurrence', () => {
    expect(() =>
      Story.story(
        keyedUpdate,
        Story.given(keyedInitialModel),
        Story.message(KeyedParentMessage.RequestedMove({ key: 'second' })),
        resolveKeyboardMove({
          binding: KeyedBinding,
          key: 'first',
          itemId: 'second-item',
          targetContainerId: 'second-target',
          targetIndex: 4,
        }),
      ),
    ).toThrow('could not find a pending keyboard move')
  })
})
