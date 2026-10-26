import { Option } from 'effect'
import type { Block } from 'foldkit'

import { DragAndDropBlock } from '@foldkit/ui'

import { issueStatusLabel } from '../domain'
import {
  IssueBoardDefinition,
  OutMessage,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
} from './definition'
import {
  maybeIssueIdFromDraggableId,
  maybeStatusFromContainerId,
} from './dragAndDrop'

const maybeMoveFromDrop = (
  reordered: typeof DragAndDropBlock.OutMessage.Reordered.Type,
) => {
  if (
    !Number.isInteger(reordered.toIndex) ||
    reordered.toIndex < 0 ||
    (reordered.fromContainerId === reordered.toContainerId &&
      reordered.fromIndex === reordered.toIndex)
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

const foldDragAndDropOutMessage = IssueBoardDefinition.makeOutMessageFold(
  DragAndDropBlock,
  {
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
              `Position ${toIndex + 1} in ${issueStatusLabel(status)}.`,
          }),
      })),
    Reordered: reordered =>
      Option.match(maybeMoveFromDrop(reordered), {
        onNone: makeNoopStep,
        onSome: outMessage => makeOutMessageStep(() => outMessage),
      }),
    Cancelled: () =>
      makeFieldsStep(() => ({
        announcement: () => 'Drag cancelled. Issue order is unchanged.',
      })),
  },
)

export const DragAndDropBinding = IssueBoardDefinition.makeBinding(
  DragAndDropBlock,
  {
    field: 'dragAndDrop',
    init: { contextToArgs: () => [{ id: 'workspace-issue-board' }] },
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

export const IssueBoardComposition = IssueBoardDefinition.makeComposition({
  bindings: [DragAndDropBinding],
})
export type IssueBoardViewBuilder = Block.ViewBuilderFor<
  typeof IssueBoardComposition
>
