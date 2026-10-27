import { Array, Option, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { makeInitIfMissingStep } from 'foldkit/bindingInit'

import {
  IssueBoardBinding,
  IssueDetailBinding,
  ProjectSettingsBinding,
} from '../composition'
import { makeNoopStep, makeStep } from '../definition'
import { ApplicationRoute, maybeIssueId } from '../route'

export const initChildrenStep = makeStep(model => {
  const maybeWorkspace = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeWorkspace)) {
    return { model }
  }

  const workspace = maybeWorkspace.value
  const { route } = model

  const initIssueDetailStep = pipe(
    maybeIssueId(route),
    Option.flatMap(issueId =>
      Array.findFirst(workspace.issues, issue => issue.id === issueId),
    ),
    Option.match({
      onNone: makeNoopStep,
      onSome: issue =>
        makeInitIfMissingStep(IssueDetailBinding, {
          key: issue.id,
          args: [issue],
        }),
    }),
  )

  const findProject = (projectId: string) =>
    Array.findFirst(workspace.projects, project => project.id === projectId)

  const initChildrenForRouteStep = ApplicationRoute.matchOrElse(
    route,
    {
      Board: ({ projectId }) =>
        Option.match(findProject(projectId), {
          onNone: makeNoopStep,
          onSome: project =>
            makeInitIfMissingStep(IssueBoardBinding, {
              key: project.id,
              args: [],
            }),
        }),
      ProjectSettings: ({ projectId }) =>
        Option.match(findProject(projectId), {
          onNone: makeNoopStep,
          onSome: project =>
            makeInitIfMissingStep(ProjectSettingsBinding, {
              key: project.id,
              args: [project],
            }),
        }),
    },
    makeNoopStep,
  )

  return Update.combineSteps([initIssueDetailStep, initChildrenForRouteStep])
})
