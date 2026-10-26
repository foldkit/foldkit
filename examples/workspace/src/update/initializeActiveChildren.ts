import { Array, Option, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { initAndAppend } from 'foldkit/bindingInit'

import {
  IssueBoardBinding,
  IssueDetailBinding,
  ProjectSettingsBinding,
} from '../composition'
import { makeNoopStep, makeStep } from '../definition'
import { ApplicationRoute, pageRoute } from '../route'

const initializeIssueDetailIfMissing = (issueId: string) =>
  makeStep(model => {
    if (
      Array.some(
        model.issueDetailInstances,
        instance => instance.issueId === issueId,
      )
    ) {
      return { model }
    }

    return pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(snapshot =>
        Array.findFirst(snapshot.issues, issue => issue.id === issueId),
      ),
      Option.match({
        onNone: () => ({ model }),
        onSome: issue =>
          initAndAppend(IssueDetailBinding, model, {
            key: issueId,
            args: [
              issue,
              Array.findFirst(
                model.issueDrafts,
                draft => draft.issueId === issueId,
              ),
            ],
          }),
      }),
    )
  })

const initializeProjectBoardIfMissing = (projectId: string) =>
  makeStep(model => {
    if (
      Array.some(
        model.boardInstances,
        instance => instance.projectId === projectId,
      )
    ) {
      return { model }
    }

    return pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(snapshot =>
        Array.findFirst(snapshot.projects, project => project.id === projectId),
      ),
      Option.match({
        onNone: () => ({ model }),
        onSome: () =>
          initAndAppend(IssueBoardBinding, model, {
            key: projectId,
            args: [],
          }),
      }),
    )
  })

const initializeProjectSettingsIfMissing = (projectId: string) =>
  makeStep(model => {
    if (
      Array.some(
        model.projectSettingsInstances,
        instance => instance.projectId === projectId,
      )
    ) {
      return { model }
    }

    return pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(snapshot =>
        Array.findFirst(snapshot.projects, project => project.id === projectId),
      ),
      Option.match({
        onNone: () => ({ model }),
        onSome: project =>
          initAndAppend(ProjectSettingsBinding, model, {
            key: project.id,
            args: [project],
          }),
      }),
    )
  })

export const initializeActiveChildren = makeStep(model => {
  const initializeIssueDetail = ApplicationRoute.matchOrElse(
    model.route,
    { Issue: ({ issueId }) => initializeIssueDetailIfMissing(issueId) },
    makeNoopStep,
  )

  const route = pageRoute(model.route)
  const initializeProjectChild = ApplicationRoute.matchOrElse(
    route,
    {
      Board: ({ projectId }) => initializeProjectBoardIfMissing(projectId),
      ProjectSettings: ({ projectId }) =>
        initializeProjectSettingsIfMissing(projectId),
    },
    makeNoopStep,
  )

  return Update.combineSteps([initializeIssueDetail, initializeProjectChild])
})
