import { Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import { IssueBoardBlock } from './block'
import { DragAndDropBinding } from './composition'
import { containerId, draggableId } from './dragAndDrop'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { OutMessage } from './outMessage'

describe('Issue Board update', () => {
  it.effect('folds a keyboard drop into a move request', () => {
    const itemId = draggableId('issue-101')
    return Story.story(
      { block: IssueBoardBlock, layer },
      Story.init(),
      Story.messageIn(
        DragAndDropBinding,
        DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
          itemId,
          containerId: containerId('InProgress'),
          index: 0,
        }),
      ),
      Story.model(model => {
        expect(model.announcement).toContain('Issue picked up.')
      }),
      Story.messageIn(
        DragAndDropBinding,
        DragAndDrop.DragAndDropBlock.Message.PressedArrowKey({
          direction: 'NextContainer',
        }),
      ),
      DragAndDrop.test.resolveKeyboardMove({
        binding: DragAndDropBinding,
        itemId,
        targetContainerId: containerId('Done'),
        targetIndex: 1,
      }),
      Story.messageIn(
        DragAndDropBinding,
        DragAndDrop.DragAndDropBlock.Message.ConfirmedKeyboardDrop(),
      ),
      Story.expectOutMessage(
        OutMessage.RequestedMove({
          issueId: 'issue-101',
          status: 'Done',
          insertionIndex: 1,
        }),
      ),
      DragAndDrop.test.settleFocus({ binding: DragAndDropBinding, itemId }),
      Story.model(model => {
        expect(model.dragAndDrop.dragState._tag).toBe('Idle')
        expect(model.announcement).toBe('Moved to Done, position 2.')
      }),
    )
  })

  it.effect('announces a pointer drop and a persistence rollback', () => {
    return Story.story(
      { block: IssueBoardBlock, layer },
      Story.init(),
      Story.messageIn(
        DragAndDropBinding,
        DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
          itemId: draggableId('issue-101'),
          containerId: containerId('InProgress'),
          index: 0,
          screenX: 0,
          screenY: 0,
        }),
      ),
      Story.messageIn(
        DragAndDropBinding,
        DragAndDrop.DragAndDropBlock.Message.MovedPointer({
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
      Story.messageIn(
        DragAndDropBinding,
        DragAndDrop.DragAndDropBlock.Message.ReleasedPointer(),
      ),
      Story.expectOutMessage(
        OutMessage.RequestedMove({
          issueId: 'issue-101',
          status: 'Todo',
          insertionIndex: 2,
        }),
      ),
      Story.model(model => {
        expect(model.announcement).toBe('Moved to Todo, position 3.')
      }),
      Story.inMessage(InMessage.InformedOfIssueMoveFailure()),
      Story.model(model => {
        expect(model.announcement).toBe(
          'Could not save the move. Issue position restored.',
        )
      }),
    )
  })

  it.effect(
    'announces cancellation without requesting a repository move',
    () => {
      const itemId = draggableId('issue-101')
      return Story.story(
        { block: IssueBoardBlock, layer },
        Story.init(),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
            itemId,
            containerId: containerId('InProgress'),
            index: 0,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.CancelledDrag(),
        ),
        Story.expectNoOutMessage(),
        DragAndDrop.test.settleFocus({ binding: DragAndDropBinding, itemId }),
        Story.model(model => {
          expect(model.dragAndDrop.dragState._tag).toBe('Idle')
          expect(model.announcement).toBe(
            'Drag cancelled. Issue order is unchanged.',
          )
        }),
      )
    },
  )

  describe('when a pointer drop stays in the same column', () => {
    it.effect('preserves the insertion index reported by DragAndDrop', () => {
      return Story.story(
        { block: IssueBoardBlock, layer },
        Story.init(),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
            itemId: draggableId('issue-101'),
            containerId: containerId('Todo'),
            index: 0,
            screenX: 0,
            screenY: 0,
          }),
        ),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.MovedPointer({
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
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.ReleasedPointer(),
        ),
        Story.expectOutMessage(
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
      ({ containerId: targetContainerId, index }) => {
        return Story.story(
          { block: IssueBoardBlock, layer },
          Story.init(),
          Story.messageIn(
            DragAndDropBinding,
            DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
              itemId: draggableId('issue-101'),
              containerId: containerId('Todo'),
              index: 1,
              screenX: 0,
              screenY: 0,
            }),
          ),
          Story.messageIn(
            DragAndDropBinding,
            DragAndDrop.DragAndDropBlock.Message.MovedPointer({
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
          Story.messageIn(
            DragAndDropBinding,
            DragAndDrop.DragAndDropBlock.Message.ReleasedPointer(),
          ),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.dragAndDrop.dragState._tag).toBe('Idle')
          }),
        )
      },
    )
  })
})
