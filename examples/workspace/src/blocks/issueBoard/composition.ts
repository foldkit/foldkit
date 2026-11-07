import { Option } from 'effect'
import type { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

import { Issue } from '../../domain'
import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeStep,
} from './block'
import {
  maybeIssueIdFromDraggableId,
  maybeStatusFromContainerId,
} from './dragAndDrop'
import { OutMessage } from './outMessage'

type ReorderedDragAndDrop =
  typeof DragAndDrop.DragAndDropBlock.OutMessage.Reordered.Type

const maybeMoveRequestFromReorder = (reordered: ReorderedDragAndDrop) => {
  if (
    reordered.fromContainerId === reordered.toContainerId &&
    reordered.fromIndex === reordered.toIndex
  ) {
    return Option.none()
  }

  return Option.gen(function* () {
    const issueId = yield* maybeIssueIdFromDraggableId(reordered.itemId)
    const status = yield* maybeStatusFromContainerId(reordered.toContainerId)

    return OutMessage.RequestedMove({
      issueId,
      status,
      insertionIndex: reordered.toIndex,
    })
  })
}

export const DragAndDropBinding = makeRequiredFieldBinding(
  DragAndDrop.DragAndDropBlock,
  {
    field: 'dragAndDrop',
    init: { contextToArgs: () => [{ id: 'workspace-issue-board' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(DragAndDrop.DragAndDropBlock, {
    StartedKeyboardDrag: () =>
      makeFieldsStep(() => ({
        announcement: () =>
          'Issue picked up. Use arrow keys to change position, Tab to change status, Space to drop, or Escape to cancel.',
      })),
    ChangedKeyboardTarget: ({ toContainerId, toIndex }) =>
      makeFieldsStep(() => ({
        announcement: announcement =>
          Option.match(maybeStatusFromContainerId(toContainerId), {
            onNone: () => announcement,
            onSome: status =>
              `Position ${toIndex + 1} in ${Issue.statusLabel(status)}.`,
          }),
      })),
    Reordered: reordered =>
      Option.match(maybeMoveRequestFromReorder(reordered), {
        onNone: makeNoopStep,
        onSome: outMessage =>
          makeStep(model => ({
            model: modifyFields(model, {
              announcement: () =>
                `Moved to ${Issue.statusLabel(outMessage.status)}, position ${outMessage.insertionIndex + 1}.`,
            }),
            outMessage,
          })),
      }),
    Cancelled: () =>
      makeFieldsStep(() => ({
        announcement: () => 'Drag cancelled. Issue order is unchanged.',
      })),
  }),
})

export const IssueBoardComposition = makeComposition({
  bindings: [DragAndDropBinding],
})
export type IssueBoardViewBuilder = Block.ViewBuilderFor<
  typeof IssueBoardComposition
>
