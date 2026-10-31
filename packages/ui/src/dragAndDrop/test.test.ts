import { Array, Cause, Effect, Exit, Layer, Option, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  DragAndDrop,
  DragAndDropLive,
  DragState,
  FocusItem,
  type Model,
  maybeDropTarget,
} from './block.js'
import { resolveKeyboardMove, settleFocus } from './test.js'

const expectStoryFailure = <E, R>(
  story: Effect.Effect<void, E, R>,
  message: string,
): Effect.Effect<void, never, R> =>
  Effect.map(Effect.exit(story), exit => {
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain(message)
    }
  })

const keyboardDragging = (id: string, itemId: string): Model => ({
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

const ParentMessage = defineMessageUnion({
  RequestedLeftMove: {},
  RequestedRightMove: {},
  RequestedBothMoves: {},
  RequestedLeftDrop: {},
})

class Parent extends Block<Parent>()('Parent', {
  Model: Schema.Struct({ left: DragAndDrop, right: DragAndDrop }),
  Message: ParentMessage,
}) {}

const ParentLive = Parent.make(
  Effect.fn(function* () {
    const left = yield* new DragAndDrop('left', {})
    const right = yield* new DragAndDrop('right', {})

    return {
      model: { left, right },
      update: {
        RequestedLeftMove: model => ({
          model,
          messages: [
            model.left.send(
              DragAndDrop.Message.PressedArrowKey({ direction: 'Right' }),
            ),
          ],
        }),
        RequestedRightMove: model => ({
          model,
          messages: [
            model.right.send(
              DragAndDrop.Message.PressedArrowKey({ direction: 'Right' }),
            ),
          ],
        }),
        RequestedBothMoves: model => ({
          model,
          messages: [
            model.left.send(
              DragAndDrop.Message.PressedArrowKey({ direction: 'Right' }),
            ),
            model.right.send(
              DragAndDrop.Message.PressedArrowKey({ direction: 'Right' }),
            ),
          ],
        }),
        RequestedLeftDrop: model => ({
          model,
          messages: [
            model.left.send(DragAndDrop.Message.ConfirmedKeyboardDrop()),
          ],
        }),
      },
    }
  }),
).pipe(Layer.provide(DragAndDropLive))

const initialModel = {
  left: keyboardDragging('left', 'left-item'),
  right: keyboardDragging('right', 'right-item'),
}

describe('DragAndDrop.test path selection', () => {
  it.effect('settles focus for the selected embedded instance', () =>
    Story.story(
      ParentLive,
      Story.given(initialModel),
      Story.message(ParentMessage.RequestedLeftDrop()),
      settleFocus({ path: 'left', itemId: 'left-item' }),
      Story.Command.expectNone(),
    ),
  )

  it.effect('rejects focus settlement at a sibling path', () =>
    expectStoryFailure(
      Story.story(
        ParentLive,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedLeftDrop()),
        settleFocus({ path: 'right', itemId: 'left-item' }),
      ),
      'could not find a pending FocusItem for item "left-item" at path ["right"]',
    ),
  )

  it.effect(
    'resolves the selected embedded instance and leaves its sibling unchanged',
    () =>
      Story.story(
        ParentLive,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedLeftMove()),
        resolveKeyboardMove({
          path: 'left',
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
          expect(model.right).toEqual(initialModel.right)
        }),
        Story.Command.expectNone(),
      ),
  )

  it.effect('rejects a sibling path even when it owns the same Command', () =>
    expectStoryFailure(
      Story.story(
        ParentLive,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedLeftMove()),
        resolveKeyboardMove({
          path: 'right',
          itemId: 'left-item',
          targetContainerId: 'left-target',
          targetIndex: 2,
        }),
      ),
      'could not find a pending keyboard move',
    ),
  )

  it.effect('rejects a selected move whose result produces no focus', () =>
    expectStoryFailure(
      Story.story(
        ParentLive,
        Story.given(initialModel),
        Story.message(ParentMessage.RequestedLeftMove()),
        Story.message(
          Block.deliver(
            DragAndDrop,
            'left',
            DragAndDrop.Message.CancelledDrag(),
          ),
        ),
        Story.Command.resolve(
          FocusItem,
          DragAndDrop.Message.CompletedFocusItem(),
        ),
        Story.message(
          Block.deliver(
            DragAndDrop,
            'left',
            DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId: 'left-item',
              containerId: 'left-source',
              index: 0,
            }),
          ),
        ),
        resolveKeyboardMove({
          path: 'left',
          itemId: 'left-item',
          targetContainerId: 'left-target',
          targetIndex: 2,
        }),
      ),
      'could not find a pending FocusItem for item "left-item" at path ["left"]',
    ),
  )

  it.effect('resolves each of two pending moves for one item by path', () =>
    Story.story(
      ParentLive,
      Story.given({
        left: keyboardDragging('left', 'shared-item'),
        right: keyboardDragging('right', 'shared-item'),
      }),
      Story.message(ParentMessage.RequestedBothMoves()),
      resolveKeyboardMove({
        path: ['right'],
        itemId: 'shared-item',
        targetContainerId: 'right-target',
        targetIndex: 3,
      }),
      resolveKeyboardMove({
        path: ['left'],
        itemId: 'shared-item',
        targetContainerId: 'left-target',
        targetIndex: 1,
      }),
      Story.model(model => {
        expect(maybeDropTarget(model.left)).toEqual(
          Option.some({ containerId: 'left-target', index: 1 }),
        )
        expect(maybeDropTarget(model.right)).toEqual(
          Option.some({ containerId: 'right-target', index: 3 }),
        )
      }),
      Story.Command.expectNone(),
    ),
  )

  it.effect('rejects two pending moves for one item without a path', () =>
    expectStoryFailure(
      Story.story(
        ParentLive,
        Story.given({
          left: keyboardDragging('left', 'shared-item'),
          right: keyboardDragging('right', 'shared-item'),
        }),
        Story.message(ParentMessage.RequestedBothMoves()),
        resolveKeyboardMove({
          itemId: 'shared-item',
          targetContainerId: 'left-target',
          targetIndex: 1,
        }),
      ),
      'pass a path when the candidates come from embedded instances',
    ),
  )
})

const NestedMessage = defineMessageUnion({ RequestedBothMoves: {} })

class NestedParent extends Block<NestedParent>()('NestedParent', {
  Model: Schema.Struct({ slots: Schema.Array(Parent) }),
  Message: NestedMessage,
}) {}

const NestedParentLive = NestedParent.make(
  Effect.fn(function* () {
    const slot = yield* Parent.each('slots')

    return {
      model: { slots: [slot('first'), slot('second')] },
      update: {
        RequestedBothMoves: model => ({
          model,
          messages: Array.map(model.slots, parent =>
            parent.send(ParentMessage.RequestedLeftMove()),
          ),
        }),
      },
    }
  }),
).pipe(Layer.provide(ParentLive))

const nestedInitialModel = { slots: [initialModel, initialModel] }

describe('DragAndDrop.test nested paths', () => {
  it.effect('resolves a move in a nested instance by its full path', () =>
    Story.story(
      NestedParentLive,
      Story.given({
        slots: [
          initialModel,
          {
            left: keyboardDragging('left', 'second-item'),
            right: keyboardDragging('right', 'right-item'),
          },
        ],
      }),
      Story.message(NestedMessage.RequestedBothMoves()),
      resolveKeyboardMove({
        path: ['slots', 'second', 'left'],
        itemId: 'second-item',
        targetContainerId: 'left-target',
        targetIndex: 2,
      }),
      resolveKeyboardMove({
        path: ['slots', 'first', 'left'],
        itemId: 'left-item',
        targetContainerId: 'left-target',
        targetIndex: 1,
      }),
      Story.model(model => {
        expect(
          Option.getOrThrow(Array.get(model.slots, 1)).left.dragState,
        ).toEqual(
          DragState.KeyboardDragging({
            itemId: 'second-item',
            sourceContainerId: 'left-source',
            sourceIndex: 0,
            targetContainerId: 'left-target',
            targetIndex: 2,
          }),
        )
      }),
    ),
  )

  it.effect(
    'rejects identical pending moves from instances at different paths',
    () =>
      expectStoryFailure(
        Story.story(
          NestedParentLive,
          Story.given(nestedInitialModel),
          Story.message(NestedMessage.RequestedBothMoves()),
          resolveKeyboardMove({
            path: ['slots', 'first', 'left'],
            itemId: 'left-item',
            targetContainerId: 'left-target',
            targetIndex: 2,
          }),
        ),
        'Isolate one instance',
      ),
  )
})

const KeyedParentMessage = defineMessageUnion({
  RequestedMove: { key: Schema.String },
})

class KeyedParent extends Block<KeyedParent>()('KeyedParent', {
  Model: Schema.Struct({ boards: Schema.Array(DragAndDrop) }),
  Message: KeyedParentMessage,
}) {}

const KeyedParentLive = KeyedParent.make(
  Effect.fn(function* () {
    const board = yield* DragAndDrop.each('boards', {})

    return {
      model: { boards: [board('first'), board('second')] },
      update: {
        RequestedMove: (model, { key }) => ({
          model,
          messages: pipe(
            model.boards,
            Array.filter(dragAndDrop => dragAndDrop.id === key),
            Array.map(dragAndDrop =>
              dragAndDrop.send(
                DragAndDrop.Message.PressedArrowKey({ direction: 'Down' }),
              ),
            ),
          ),
        }),
      },
    }
  }),
).pipe(Layer.provide(DragAndDropLive))

const keyedInitialModel = {
  boards: [
    keyboardDragging('first', 'first-item'),
    keyboardDragging('second', 'second-item'),
  ],
}

describe('DragAndDrop.test keyed paths', () => {
  it.effect('resolves the selected keyed instance', () =>
    Story.story(
      KeyedParentLive,
      Story.given(keyedInitialModel),
      Story.message(KeyedParentMessage.RequestedMove({ key: 'second' })),
      resolveKeyboardMove({
        path: ['boards', 'second'],
        itemId: 'second-item',
        targetContainerId: 'second-target',
        targetIndex: 4,
      }),
      Story.model(model => {
        expect(model.boards).toHaveLength(2)
        expect(Option.getOrThrow(Array.get(model.boards, 1)).dragState).toEqual(
          DragState.KeyboardDragging({
            itemId: 'second-item',
            sourceContainerId: 'second-source',
            sourceIndex: 0,
            targetContainerId: 'second-target',
            targetIndex: 4,
          }),
        )
      }),
    ),
  )

  it.effect('rejects the wrong keyed instance', () =>
    expectStoryFailure(
      Story.story(
        KeyedParentLive,
        Story.given(keyedInitialModel),
        Story.message(KeyedParentMessage.RequestedMove({ key: 'second' })),
        resolveKeyboardMove({
          path: ['boards', 'first'],
          itemId: 'second-item',
          targetContainerId: 'second-target',
          targetIndex: 4,
        }),
      ),
      'could not find a pending keyboard move',
    ),
  )
})
