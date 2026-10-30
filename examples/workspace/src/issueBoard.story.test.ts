import { Option } from 'effect'
import { Block } from 'foldkit'
import {
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  story,
} from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import {
  IssueBoardLive,
  Message,
  OutMessage,
  containerId,
  draggableId,
} from './issueBoard'

type DragAndDropMessage = typeof DragAndDrop.DragAndDrop.Message.Type

const DRAG_AND_DROP_PATH = 'dragAndDrop'

const dragMessage = (message: DragAndDropMessage) =>
  Block.deliver(DragAndDrop.DragAndDrop, DRAG_AND_DROP_PATH, message)

describe('Issue Board update', () => {
  it.effect('folds a keyboard drop into a move request', () => {
    const itemId = draggableId('issue-101')

    return story(
      IssueBoardLive,
      message(
        dragMessage(
          DragAndDrop.DragAndDrop.Message.ActivatedKeyboardDrag({
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
          DragAndDrop.DragAndDrop.Message.PressedArrowKey({
            direction: 'NextContainer',
          }),
        ),
      ),
      DragAndDrop.test.resolveKeyboardMove({
        path: DRAG_AND_DROP_PATH,
        itemId,
        targetContainerId: containerId('Done'),
        targetIndex: 1,
      }),
      message(
        dragMessage(DragAndDrop.DragAndDrop.Message.ConfirmedKeyboardDrop()),
      ),
      expectOutMessage(
        OutMessage.RequestedMove({
          issueId: 'issue-101',
          status: 'Done',
          insertionIndex: 1,
        }),
      ),
      DragAndDrop.test.settleFocus({ path: DRAG_AND_DROP_PATH, itemId }),
      model(model => {
        expect(model.dragAndDrop.dragState._tag).toBe('Idle')
        expect(model.announcement).toBe('Position 2 in Done.')
      }),
    )
  })

  it.effect('announces an applied move and a persistence rollback', () =>
    story(
      IssueBoardLive,
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
    ),
  )

  it.effect('folds a pointer drop into a move request', () =>
    story(
      IssueBoardLive,
      message(
        dragMessage(
          DragAndDrop.DragAndDrop.Message.PressedDraggable({
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
          DragAndDrop.DragAndDrop.Message.MovedPointer({
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
      message(dragMessage(DragAndDrop.DragAndDrop.Message.ReleasedPointer())),
      expectOutMessage(
        OutMessage.RequestedMove({
          issueId: 'issue-101',
          status: 'Todo',
          insertionIndex: 2,
        }),
      ),
    ),
  )

  it.effect(
    'announces cancellation without requesting a repository move',
    () => {
      const itemId = draggableId('issue-101')

      return story(
        IssueBoardLive,
        message(
          dragMessage(
            DragAndDrop.DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId,
              containerId: containerId('InProgress'),
              index: 0,
            }),
          ),
        ),
        message(dragMessage(DragAndDrop.DragAndDrop.Message.CancelledDrag())),
        expectNoOutMessage(),
        DragAndDrop.test.settleFocus({ path: DRAG_AND_DROP_PATH, itemId }),
        model(model => {
          expect(model.dragAndDrop.dragState._tag).toBe('Idle')
          expect(model.announcement).toBe(
            'Drag cancelled. Issue order is unchanged.',
          )
        }),
      )
    },
  )

  describe('when a pointer drop stays in the same column', () => {
    it.effect('preserves the insertion index reported by DragAndDrop', () =>
      story(
        IssueBoardLive,
        message(
          dragMessage(
            DragAndDrop.DragAndDrop.Message.PressedDraggable({
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
            DragAndDrop.DragAndDrop.Message.MovedPointer({
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
        message(dragMessage(DragAndDrop.DragAndDrop.Message.ReleasedPointer())),
        expectOutMessage(
          OutMessage.RequestedMove({
            issueId: 'issue-101',
            status: 'Todo',
            insertionIndex: 3,
          }),
        ),
      ),
    )
  })

  describe('when a pointer drop does not select a different Board position', () => {
    it.effect.each([
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
      ({ containerId: targetContainerId, index }) =>
        story(
          IssueBoardLive,
          message(
            dragMessage(
              DragAndDrop.DragAndDrop.Message.PressedDraggable({
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
              DragAndDrop.DragAndDrop.Message.MovedPointer({
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
            dragMessage(DragAndDrop.DragAndDrop.Message.ReleasedPointer()),
          ),
          expectNoOutMessage(),
          model(model => {
            expect(model.dragAndDrop.dragState._tag).toBe('Idle')
          }),
        ),
    )
  })
})
