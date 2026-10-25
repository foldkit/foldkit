import { Option } from 'effect'
import {
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { DragAndDrop, DragAndDropBlock } from '@foldkit/ui'

import { IssueBoardBlock } from './block'
import { DragAndDropBinding } from './composition'
import { Message, OutMessage } from './definition'
import { containerId, draggableId } from './dragAndDrop'
import { update } from './update'

const boardInit = IssueBoardBlock.init()
const dragMessage = (message: typeof DragAndDropBlock.Message.Type) =>
  toParentMessage(DragAndDropBinding, message)

describe('Issue Board update', () => {
  test('folds a keyboard drop into a move request', () => {
    const itemId = draggableId('issue-101')

    story(
      update,
      given(boardInit.model),
      message(
        dragMessage(
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
          DragAndDropBlock.Message.PressedArrowKey({
            direction: 'NextContainer',
          }),
        ),
      ),
      DragAndDrop.test.resolveKeyboardMove({
        binding: DragAndDropBinding,
        itemId,
        targetContainerId: containerId('Done'),
        targetIndex: 1,
      }),
      message(dragMessage(DragAndDropBlock.Message.ConfirmedKeyboardDrop())),
      expectOutMessage(
        OutMessage.RequestedMove({
          issueId: 'issue-101',
          status: 'Done',
          insertionIndex: 1,
        }),
      ),
      DragAndDrop.test.settleFocus({ binding: DragAndDropBinding, itemId }),
      model(model => {
        expect(model.dragAndDrop.dragState._tag).toBe('Idle')
        expect(model.announcement).toBe('Position 2 in Done.')
      }),
    )
  })

  test('announces an applied move and a persistence rollback', () => {
    story(
      update,
      given(boardInit.model),
      message(
        Message.InformedOfIssueMove({ status: 'Done', insertionIndex: 1 }),
      ),
      model(model => {
        expect(model.announcement).toBe('Moved to Done, position 2.')
      }),
      message(Message.InformedOfIssueMoveFailure()),
      model(model => {
        expect(model.announcement).toBe(
          'Could not save the move. Issue position restored.',
        )
      }),
    )
  })

  test('folds a pointer drop into a move request', () => {
    story(
      update,
      given(boardInit.model),
      message(
        dragMessage(
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
      message(dragMessage(DragAndDropBlock.Message.ReleasedPointer())),
      expectOutMessage(
        OutMessage.RequestedMove({
          issueId: 'issue-101',
          status: 'Todo',
          insertionIndex: 2,
        }),
      ),
    )
  })

  test('announces cancellation without requesting a repository move', () => {
    const itemId = draggableId('issue-101')

    story(
      update,
      given(boardInit.model),
      message(
        dragMessage(
          DragAndDropBlock.Message.ActivatedKeyboardDrag({
            itemId,
            containerId: containerId('InProgress'),
            index: 0,
          }),
        ),
      ),
      message(dragMessage(DragAndDropBlock.Message.CancelledDrag())),
      expectNoOutMessage(),
      DragAndDrop.test.settleFocus({ binding: DragAndDropBinding, itemId }),
      model(model => {
        expect(model.dragAndDrop.dragState._tag).toBe('Idle')
        expect(model.announcement).toBe(
          'Drag cancelled. Issue order is unchanged.',
        )
      }),
    )
  })

  describe('when a pointer drop stays in the same column', () => {
    test('preserves the insertion index reported by DragAndDrop', () => {
      story(
        update,
        given(boardInit.model),
        message(
          dragMessage(
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
        message(dragMessage(DragAndDropBlock.Message.ReleasedPointer())),
        expectOutMessage(
          OutMessage.RequestedMove({
            issueId: 'issue-101',
            status: 'Todo',
            insertionIndex: 3,
          }),
        ),
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
        story(
          update,
          given(boardInit.model),
          message(
            dragMessage(
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
          message(dragMessage(DragAndDropBlock.Message.ReleasedPointer())),
          expectNoOutMessage(),
          model(model => {
            expect(model.dragAndDrop.dragState._tag).toBe('Idle')
          }),
        )
      },
    )
  })
})
