import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { __bindCommandMatcher, __commandMatches } from 'foldkit/test'
import * as Update from 'foldkit/update'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DragAndDropBlock, DragState, layer } from './block.js'
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

const DragAndDropTestParentKey = Symbol('DragAndDropTestParent')
const DragAndDropTestParentBlock = Block.make('DragAndDropTestParent', {
  key: DragAndDropTestParentKey,
  InitArgs: Block.makeInputContract<readonly []>(),
  Model: ParentModel,
  Message: ParentMessage,
})

const foldDragAndDropOutMessage = DragAndDropTestParentBlock.makeOutMessageFold(
  DragAndDropBlock,
  {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  },
)

const LeftBinding = DragAndDropTestParentBlock.makeRequiredFieldBinding(
  DragAndDropBlock,
  {
    field: 'left',
    init: false,
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const RightBinding = DragAndDropTestParentBlock.makeRequiredFieldBinding(
  DragAndDropBlock,
  {
    field: 'right',
    init: false,
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const DragAndDropTestParentComposition =
  DragAndDropTestParentBlock.makeComposition({
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

const keyboardDragging = (id: string, itemId: string) =>
  DragAndDropBlock.Model.make({
    id,
    orientation: 'Vertical',
    activationThreshold: 5,
    keyboardDragGeneration: 0,
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

const parentInit = DragAndDropTestParentComposition.makeInit(() => ({
  model: initialModel,
}))
const ParentBlock = {
  block: DragAndDropTestParentBlock,
  layer: DragAndDropTestParentBlock.makeLayer(
    Effect.gen(function* () {
      const children = yield* DragAndDropTestParentComposition.acquireChildren()

      return {
        children,
        init: parentInit,
        update,
      }
    }),
  ).pipe(Layer.provide(layer)),
}
const NestedParentBlock = DragAndDropTestParentBlock
const OtherDragAndDropKey = Symbol('OtherDragAndDrop')
const OtherDragAndDropBlock = Block.make('OtherDragAndDrop', {
  key: OtherDragAndDropKey,
  InitArgs: Block.makeInputContract<readonly []>(),
  Model: DragAndDropBlock.Model,
  Message: DragAndDropBlock.Message,
})

if (false) {
  __bindCommandMatcher(
    OtherDragAndDropBlock,
    // @ts-expect-error Matching Model storage does not permit another child contract.
    LeftBinding,
    FocusItem({ itemId: 'left-item' }),
  )
}

describe('DragAndDrop.test Binding selection', () => {
  it('rejects a different original child contract through an erased call', () => {
    expect(() =>
      Reflect.apply(__bindCommandMatcher, undefined, [
        OtherDragAndDropBlock,
        LeftBinding,
        FocusItem({ itemId: 'left-item' }),
      ]),
    ).toThrow('belongs to a different completed Block instance')
  })

  it.effect(
    'reuses a bound helper across independent graph acquisitions',
    () => {
      const resolveLeft = settleFocus({
        binding: LeftBinding,
        itemId: 'left-item',
      })

      return Effect.all([
        Story.story(
          ParentBlock,
          Story.given(initialModel),
          Story.message(ParentMessage.RequestedLeftDrop()),
          resolveLeft,
        ),
        Story.story(
          ParentBlock,
          Story.given(initialModel),
          Story.message(ParentMessage.RequestedLeftDrop()),
          resolveLeft,
        ),
      ])
    },
  )
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

  it.effect('settles focus for the selected embedded Binding', () => {
    return Story.story(
      ParentBlock,
      Story.given(initialModel),
      Story.message(ParentMessage.RequestedLeftDrop()),
      settleFocus({ binding: LeftBinding, itemId: 'left-item' }),
    )
  })

  it.effect(
    'resolves the selected embedded Binding and leaves its sibling unchanged',
    () => {
      return Story.story(
        ParentBlock,
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
    },
  )

  it.effect(
    'rejects a sibling Binding even when it owns the same Command Definition',
    () =>
      Story.withBlock(ParentBlock, parent => {
        expect(() =>
          Story.story(
            parent.update,
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
      }),
  )

  it.effect('rejects a scoped move whose result omits its focus Command', () =>
    Story.withBlock(ParentBlock, parent => {
      const updateWithoutFocus = (
        model: ParentModel,
        message: ParentMessage,
      ) => {
        const parentUpdate = parent.update(model, message)

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
    }),
  )

  it.effect('resolves one of two identical pending moves by Binding', () => {
    const sharedItemModel: ParentModel = {
      left: keyboardDragging('left', 'shared-item'),
      right: keyboardDragging('right', 'shared-item'),
    }

    return Story.story(
      ParentBlock,
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

const NestedSlot = Schema.Struct({
  key: Schema.String,
  parent: ParentModel,
})
type NestedSlot = typeof NestedSlot.Type

const NestedModel = Schema.Struct({ slots: Schema.Array(NestedSlot) })
type NestedModel = typeof NestedModel.Type

const NestedMessage = defineMessageUnion({ RequestedBothMoves: {} })
type NestedMessage = typeof NestedMessage.Type

const NestedDragAndDropTestParentKey = Symbol('NestedDragAndDropTestParent')
const NestedDragAndDropTestParentBlock = Block.make(
  'NestedDragAndDropTestParent',
  {
    key: NestedDragAndDropTestParentKey,
    InitArgs: Block.makeInputContract<readonly []>(),
    Model: NestedModel,
    Message: NestedMessage,
  },
)

const NestedBinding = NestedDragAndDropTestParentBlock.makeCustomKeyedBinding(
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
  NestedDragAndDropTestParentBlock.makeComposition({
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

const NestedBlockInit = NestedDragAndDropTestParentComposition.makeInit(() => ({
  model: nestedInitialModel,
}))
const NestedBlock = {
  block: NestedDragAndDropTestParentBlock,
  layer: NestedDragAndDropTestParentBlock.makeLayer(
    Effect.gen(function* () {
      const children =
        yield* NestedDragAndDropTestParentComposition.acquireChildren()

      return {
        children,
        init: NestedBlockInit,
        update: nestedUpdate,
      }
    }),
  ).pipe(Layer.provide(ParentBlock.layer)),
}

describe('DragAndDrop.test nested ancestor selection', () => {
  it.effect(
    'fails before resolving when an ancestor Binding occurrence is ambiguous',
    () =>
      Story.withBlock(NestedBlock, parent => {
        expect(() =>
          Story.story(
            parent.update,
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
      }),
  )
})

const KeyedSlot = Schema.Struct({
  key: Schema.String,
  dragAndDrop: DragAndDropBlock.Model,
})
type KeyedSlot = typeof KeyedSlot.Type

const KeyedParentModel = Schema.Struct({ slots: Schema.Array(KeyedSlot) })
type KeyedParentModel = typeof KeyedParentModel.Type

const KeyedParentMessage = defineMessageUnion({
  RequestedMove: { key: Schema.String },
})
type KeyedParentMessage = typeof KeyedParentMessage.Type

const KeyedDragAndDropTestParentKey = Symbol('KeyedDragAndDropTestParent')
const KeyedDragAndDropTestParentBlock = Block.make(
  'KeyedDragAndDropTestParent',
  {
    key: KeyedDragAndDropTestParentKey,
    InitArgs: Block.makeInputContract<readonly []>(),
    Model: KeyedParentModel,
    Message: KeyedParentMessage,
  },
)

const foldKeyedDragAndDropOutMessage =
  KeyedDragAndDropTestParentBlock.makeOutMessageFold(DragAndDropBlock, {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  })

const KeyedBinding = KeyedDragAndDropTestParentBlock.makeCustomKeyedBinding(
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
  fold: foldKeyedDragAndDropOutMessage,
})

const KeyedDragAndDropTestParentComposition =
  KeyedDragAndDropTestParentBlock.makeComposition({
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

const KeyedBlockInit = KeyedDragAndDropTestParentComposition.makeInit(() => ({
  model: keyedInitialModel,
}))
const KeyedBlock = {
  block: KeyedDragAndDropTestParentBlock,
  layer: KeyedDragAndDropTestParentBlock.makeLayer(
    Effect.gen(function* () {
      const children =
        yield* KeyedDragAndDropTestParentComposition.acquireChildren()

      return {
        children,
        init: KeyedBlockInit,
        update: keyedUpdate,
      }
    }),
  ).pipe(Layer.provide(layer)),
}

if (false) {
  // @ts-expect-error The selected Binding requires its decoded string key.
  settleFocus({ binding: KeyedBinding, key: 1, itemId: 'second-item' })
}

describe('DragAndDrop.test keyed Binding selection', () => {
  it.effect('resolves the selected keyed occurrence', () => {
    return Story.story(
      KeyedBlock,
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

  it.effect('rejects the wrong keyed occurrence', () =>
    Story.withBlock(KeyedBlock, parent => {
      expect(() =>
        Story.story(
          parent.update,
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
    }),
  )
})
