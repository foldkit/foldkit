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

const initializeIssueDetailIfMissingStep = (issueId: string) =>
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

const initializeProjectBoardIfMissingStep = (projectId: string) =>
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

const initializeProjectSettingsIfMissingStep = (projectId: string) =>
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

export const initializeActiveChildrenStep = makeStep(model => {
  const initializeIssueDetailStep = ApplicationRoute.matchOrElse(
    model.route,
    { Issue: ({ issueId }) => initializeIssueDetailIfMissingStep(issueId) },
    makeNoopStep,
  )

  const route = pageRoute(model.route)
  const initializeProjectChildStep = ApplicationRoute.matchOrElse(
    route,
    {
      Board: ({ projectId }) => initializeProjectBoardIfMissingStep(projectId),
      ProjectSettings: ({ projectId }) =>
        initializeProjectSettingsIfMissingStep(projectId),
    },
    makeNoopStep,
  )

  return Update.combineSteps([
    initializeIssueDetailStep,
    initializeProjectChildStep,
  ])
})
