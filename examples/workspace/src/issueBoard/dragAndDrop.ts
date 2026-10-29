import { Option, Schema } from 'effect'

import { IssueStatus } from '../domain'

const DRAGGABLE_PREFIX = 'workspace-issue:'
const CONTAINER_PREFIX = 'workspace-status:'

export const draggableId = (issueId: string) => `${DRAGGABLE_PREFIX}${issueId}`

export const containerId = (status: IssueStatus) =>
  `${CONTAINER_PREFIX}${status}`

export const maybeIssueIdFromDraggableId = (itemId: string) => {
  if (
    itemId.startsWith(DRAGGABLE_PREFIX) &&
    itemId.length > DRAGGABLE_PREFIX.length
  ) {
    return Option.some(itemId.slice(DRAGGABLE_PREFIX.length))
  } else {
    return Option.none()
  }
}

export const maybeStatusFromContainerId = (containerId: string) => {
  if (containerId.startsWith(CONTAINER_PREFIX)) {
    return Schema.decodeUnknownOption(IssueStatus)(
      containerId.slice(CONTAINER_PREFIX.length),
    )
  } else {
    return Option.none()
  }
}
