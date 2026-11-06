import { Effect, Option } from 'effect'
import { Scene, Story } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import { initialWorkspace } from '../../domain'
import { IssueBoardBlock } from './block'
import { DragAndDropBinding } from './composition'
import { containerId, draggableId } from './dragAndDrop'
import { layer } from './layer'
import { OutMessage } from './outMessage'

const viewInputs = {
  issues: initialWorkspace.issues,
  members: initialWorkspace.members,
  issueHrefsById: { 'issue-101': '/issues/issue-101' },
}

describe('Issue Board view', () => {
  it.effect('renders all statuses and exposes accessible drag handles', () => {
    const handle = Scene.role('button', { name: 'Drag WSP-101' })
    return Scene.scene(
      { block: IssueBoardBlock, layer, viewInputs },
      Scene.init(),
      Scene.expect(Scene.role('heading', { name: 'Backlog' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Todo' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'In progress' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Done' })).toExist(),
      Scene.expect(handle).toExist(),
    )
  })

  it.effect(
    'renders a native issue title link when its href is supplied',
    () => {
      return Scene.scene(
        { block: IssueBoardBlock, layer, viewInputs },
        Scene.init(),
        Scene.expect(
          Scene.role('link', { name: 'Build a faster command menu' }),
        ).toHaveAttr('href', '/issues/issue-101'),
        Scene.expectNoOutMessage(),
      )
    },
  )

  it.effect('renders non-link title content when its href is absent', () => {
    return Scene.scene(
      {
        block: IssueBoardBlock,
        layer,
        viewInputs: { ...viewInputs, ...{ issueHrefsById: {} } },
      },
      Scene.init(),
      Scene.expect(
        Scene.role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      Scene.expect(Scene.text('Build a faster command menu')).toExist(),
    )
  })

  it.effect('requests issue creation in the selected column', () => {
    return Scene.scene(
      { block: IssueBoardBlock, layer, viewInputs },
      Scene.init(),
      Scene.click(
        Scene.role('button', { name: 'Create issue in In progress' }),
      ),
      Scene.expectOutMessage(
        OutMessage.RequestedCreation({ status: 'InProgress' }),
      ),
    )
  })

  it.effect('renders the announcement from an accepted drop', () => {
    const itemId = draggableId('issue-101')

    return Effect.gen(function* () {
      const droppedModel = yield* Story.story(
        { block: IssueBoardBlock, layer },
        Story.init(),
        Story.messageIn(
          DragAndDropBinding,
          DragAndDrop.DragAndDropBlock.Message.PressedDraggable({
            itemId,
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
              containerId: containerId('Done'),
              index: 1,
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
            status: 'Done',
            insertionIndex: 1,
          }),
        ),
      )

      return yield* Scene.scene(
        { block: IssueBoardBlock, layer, viewInputs },
        Scene.given(droppedModel),
        Scene.expect(Scene.text('Moved to Done, position 2.')).toExist(),
      )
    })
  })

  it.effect('disables issue actions while saving', () => {
    const handle = Scene.role('button', { name: 'Drag WSP-101' })

    const createIssueButton = Scene.role('button', {
      name: 'Create issue in In progress',
    })

    const title = Scene.text('Build a faster command menu')
    return Scene.scene(
      {
        block: IssueBoardBlock,
        layer,
        viewInputs: { ...viewInputs, ...{ isMovePending: true } },
      },
      Scene.init(),
      Scene.expect(
        Scene.role('link', { name: 'Build a faster command menu' }),
      ).not.toExist(),
      Scene.expect(title).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(handle).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(createIssueButton).toBeDisabled(),
      Scene.expectNoOutMessage(),
      Scene.Command.expectNone(),
    )
  })
})
