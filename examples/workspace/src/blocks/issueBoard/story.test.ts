import { Effect, Option } from 'effect'
import { inMessage } from 'foldkit/story'
import * as Story from 'foldkit/story'
import {
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import {
  DragAndDropBlock,
  test as DragAndDropTest,
} from '@foldkit/ui/dragAndDrop'

import { layer } from './block'
import { DragAndDropBinding } from './composition'
import { IssueBoardBlock } from './definition'
import { containerId, draggableId } from './dragAndDrop'
import { InMessage } from './inMessage'
import { OutMessage } from './outMessage'

type DragAndDropMessage = typeof DragAndDropBlock.Message.Type

const boardInit = (executable: Story.TestBlock<typeof IssueBoardBlock>) => {
  return executable.init()
}
const dragMessage = (
  executable: Story.TestBlock<typeof IssueBoardBlock>,
  message: DragAndDropMessage,
) => {
  const toParentMessage = toParentMessageFor(executable)
  return toParentMessage(DragAndDropBinding, message)
}

describe('Issue Board update', () => {
  test('folds a keyboard drop into a move request', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        const itemId = draggableId('issue-101')

        story(
          update,
          given(boardInit(executable).model),
          message(
            dragMessage(
              executable,
              DragAndDropBlock.Message.ActivatedKeyboardDrag({
                itemId,
                containerId: containerId('InProgress'),
                index: 0,
              }),
            ),
          ),
          model(model => {
            expect(model.announcement).toContain('Issue picked up.')
          }),
          message(
            dragMessage(
              executable,
              DragAndDropBlock.Message.PressedArrowKey({
                direction: 'NextContainer',
              }),
            ),
          ),
          DragAndDropTest.resolveKeyboardMove({
            binding: DragAndDropBinding,
            itemId,
            targetContainerId: containerId('Done'),
            targetIndex: 1,
          }),
          message(
            dragMessage(
              executable,
              DragAndDropBlock.Message.ConfirmedKeyboardDrop(),
            ),
          ),
          expectOutMessage(
            OutMessage.RequestedMove({
              issueId: 'issue-101',
              status: 'Done',
              insertionIndex: 1,
            }),
          ),
          DragAndDropTest.settleFocus({ binding: DragAndDropBinding, itemId }),
          model(model => {
            expect(model.dragAndDrop.dragState._tag).toBe('Idle')
            expect(model.announcement).toBe('Position 2 in Done.')
          }),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('announces an applied move and a persistence rollback', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable =>
        Effect.gen(function* () {
          yield* story(
            IssueBoardBlock,
            given(boardInit(executable).model),
            inMessage(
              InMessage.InformedOfIssueMove({
                status: 'Done',
                insertionIndex: 1,
              }),
            ),
            model(model => {
              expect(model.announcement).toBe('Moved to Done, position 2.')
            }),
            inMessage(InMessage.InformedOfIssueMoveFailure()),
            model(model => {
              expect(model.announcement).toBe(
                'Could not save the move. Issue position restored.',
              )
            }),
          )
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('folds a pointer drop into a move request', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        story(
          update,
          given(boardInit(executable).model),
          message(
            dragMessage(
              executable,
              DragAndDropBlock.Message.PressedDraggable({
                itemId: draggableId('issue-101'),
                containerId: containerId('InProgress'),
                index: 0,
                screenX: 0,
                screenY: 0,
              }),
            ),
          ),
          message(
            dragMessage(
              executable,
              DragAndDropBlock.Message.MovedPointer({
                screenX: 100,
                screenY: 100,
                clientX: 100,
                clientY: 100,
                maybeDropTarget: Option.some({
                  containerId: containerId('Todo'),
                  index: 2,
                }),
              }),
            ),
          ),
          message(
            dragMessage(executable, DragAndDropBlock.Message.ReleasedPointer()),
          ),
          expectOutMessage(
            OutMessage.RequestedMove({
              issueId: 'issue-101',
              status: 'Todo',
              insertionIndex: 2,
            }),
          ),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('announces cancellation without requesting a repository move', () => {
    return Effect.runPromise(
      Story.withBlock(IssueBoardBlock, executable => {
        const update = executable.update

        const itemId = draggableId('issue-101')

        story(
          update,
          given(boardInit(executable).model),
          message(
            dragMessage(
              executable,
              DragAndDropBlock.Message.ActivatedKeyboardDrag({
                itemId,
                containerId: containerId('InProgress'),
                index: 0,
              }),
            ),
          ),
          message(
            dragMessage(executable, DragAndDropBlock.Message.CancelledDrag()),
          ),
          expectNoOutMessage(),
          DragAndDropTest.settleFocus({ binding: DragAndDropBinding, itemId }),
          model(model => {
            expect(model.dragAndDrop.dragState._tag).toBe('Idle')
            expect(model.announcement).toBe(
              'Drag cancelled. Issue order is unchanged.',
            )
          }),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  describe('when a pointer drop stays in the same column', () => {
    test('preserves the insertion index reported by DragAndDrop', () => {
      return Effect.runPromise(
        Story.withBlock(IssueBoardBlock, executable => {
          const update = executable.update

          story(
            update,
            given(boardInit(executable).model),
            message(
              dragMessage(
                executable,
                DragAndDropBlock.Message.PressedDraggable({
                  itemId: draggableId('issue-101'),
                  containerId: containerId('Todo'),
                  index: 0,
                  screenX: 0,
                  screenY: 0,
                }),
              ),
            ),
            message(
              dragMessage(
                executable,
                DragAndDropBlock.Message.MovedPointer({
                  screenX: 100,
                  screenY: 100,
                  clientX: 100,
                  clientY: 100,
                  maybeDropTarget: Option.some({
                    containerId: containerId('Todo'),
                    index: 3,
                  }),
                }),
              ),
            ),
            message(
              dragMessage(
                executable,
                DragAndDropBlock.Message.ReleasedPointer(),
              ),
            ),
            expectOutMessage(
              OutMessage.RequestedMove({
                issueId: 'issue-101',
                status: 'Todo',
                insertionIndex: 3,
              }),
            ),
          )
        }).pipe(Effect.provide(layer)),
      )
    })
  })

  describe('when a pointer drop does not select a different Board position', () => {
    test.each([
      {
        reason: 'the position is unchanged',
        containerId: containerId('Todo'),
        index: 1,
      },
      {
        reason: 'the target belongs to another board',
        containerId: 'other-board:Done',
        index: 0,
      },
    ])(
      'ignores the drop when $reason',
      ({ containerId: targetContainerId, index }) => {
        return Effect.runPromise(
          Story.withBlock(IssueBoardBlock, executable => {
            const update = executable.update

            story(
              update,
              given(boardInit(executable).model),
              message(
                dragMessage(
                  executable,
                  DragAndDropBlock.Message.PressedDraggable({
                    itemId: draggableId('issue-101'),
                    containerId: containerId('Todo'),
                    index: 1,
                    screenX: 0,
                    screenY: 0,
                  }),
                ),
              ),
              message(
                dragMessage(
                  executable,
                  DragAndDropBlock.Message.MovedPointer({
                    screenX: 100,
                    screenY: 100,
                    clientX: 100,
                    clientY: 100,
                    maybeDropTarget: Option.some({
                      containerId: targetContainerId,
                      index,
                    }),
                  }),
                ),
              ),
              message(
                dragMessage(
                  executable,
                  DragAndDropBlock.Message.ReleasedPointer(),
                ),
              ),
              expectNoOutMessage(),
              model(model => {
                expect(model.dragAndDrop.dragState._tag).toBe('Idle')
              }),
            )
          }).pipe(Effect.provide(layer)),
        )
      },
    )
  })
})
