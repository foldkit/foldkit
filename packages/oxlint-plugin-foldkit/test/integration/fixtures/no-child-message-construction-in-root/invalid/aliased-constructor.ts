import { Child as WorkspaceChild } from '@app/child'
import { Child } from './child'

const save = Child.Message.ClickedAliasSave
const childMessage = Child.Message
const aliasedChildMessage = childMessage
const workspaceSave = WorkspaceChild.Message.ClickedWorkspaceAliasSave

export const driveChild = (model: unknown, foldChild: (model: unknown, message: unknown) => unknown) => {
  const first = save()
  const second = aliasedChildMessage.ClickedNamespaceAliasSave()
  const third = workspaceSave()

  return foldChild(model, first ?? second ?? third)
}
