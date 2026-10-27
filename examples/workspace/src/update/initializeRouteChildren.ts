import { Array, Option, Record } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/bindingInit'

import {
  IssueBoardBinding,
  IssueDetailBinding,
  ProjectSettingsBinding,
} from '../composition'
import { makeNoopStep, makeStep } from '../definition'
import type { WorkspaceSnapshot } from '../domain'
import { ApplicationRoute, maybeIssueId } from '../route'

const initializeIssueDetailIfMissingStep = (
  issueId: string,
  snapshot: typeof WorkspaceSnapshot.Type,
) =>
  makeStep(model => {
    if (Record.has(model.issueDetails, issueId)) {
      return { model }
    }

    return Option.match(
      Array.findFirst(snapshot.issues, issue => issue.id === issueId),
      {
        onNone: () => ({ model }),
        onSome: issue =>
          initAndInsert(IssueDetailBinding, model, {
            key: issueId,
            args: [issue],
          }),
      },
    )
  })

const initializeProjectBoardIfMissingStep = (
  projectId: string,
  snapshot: typeof WorkspaceSnapshot.Type,
) =>
  makeStep(model => {
    if (Record.has(model.boards, projectId)) {
      return { model }
    }

    return Option.match(
      Array.findFirst(snapshot.projects, project => project.id === projectId),
      {
        onNone: () => ({ model }),
        onSome: () =>
          initAndInsert(IssueBoardBinding, model, {
            key: projectId,
            args: [],
          }),
      },
    )
  })

const initializeProjectSettingsIfMissingStep = (
  projectId: string,
  snapshot: typeof WorkspaceSnapshot.Type,
) =>
  makeStep(model => {
    if (Record.has(model.projectSettings, projectId)) {
      return { model }
    }

    return Option.match(
      Array.findFirst(snapshot.projects, project => project.id === projectId),
      {
        onNone: () => ({ model }),
        onSome: project =>
          initAndInsert(ProjectSettingsBinding, model, {
            key: project.id,
            args: [project],
          }),
      },
    )
  })

export const initializeRouteChildrenStep = makeStep(model => {
  const maybeSnapshot = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeSnapshot)) {
    return { model }
  }

  const snapshot = maybeSnapshot.value

  // Shouldnt we be using the Transition helpers? dont we only care to do this
  // if we are entering the route?
  const initializeIssueDetailStep = Option.match(maybeIssueId(model.route), {
    onNone: makeNoopStep,
    onSome: issueId => initializeIssueDetailIfMissingStep(issueId, snapshot),
  })

  const initializeProjectChildStep = ApplicationRoute.matchOrElse(
    model.route,
    {
      Board: ({ projectId }) =>
        initializeProjectBoardIfMissingStep(projectId, snapshot),
      ProjectSettings: ({ projectId }) =>
        initializeProjectSettingsIfMissingStep(projectId, snapshot),
    },
    makeNoopStep,
  )

  return Update.combineSteps([
    initializeIssueDetailStep,
    initializeProjectChildStep,
  ])
})
