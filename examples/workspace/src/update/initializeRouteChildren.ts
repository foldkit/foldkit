import { Array, Option, Record, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/bindingInit'

import {
  IssueBoardBinding,
  IssueDetailBinding,
  ProjectSettingsBinding,
} from '../composition'
import { makeNoopStep, makeStep } from '../definition'
import { ApplicationRoute, maybeIssueId } from '../route'

const initializeIssueDetailIfMissingStep = (issueId: string) =>
  makeStep(model => {
    if (Record.has(model.issueDetails, issueId)) {
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
          initAndInsert(IssueDetailBinding, model, {
            key: issueId,
            args: [issue],
          }),
      }),
    )
  })

const initializeProjectBoardIfMissingStep = (projectId: string) =>
  makeStep(model => {
    if (Record.has(model.boards, projectId)) {
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
          initAndInsert(IssueBoardBinding, model, {
            key: projectId,
            args: [],
          }),
      }),
    )
  })

const initializeProjectSettingsIfMissingStep = (projectId: string) =>
  makeStep(model => {
    if (Record.has(model.projectSettings, projectId)) {
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
          initAndInsert(ProjectSettingsBinding, model, {
            key: project.id,
            args: [project],
          }),
      }),
    )
  })

export const initializeRouteChildrenStep = makeStep(model => {
  // Shouldnt we be using the Transition helpers? dont we only care to do this
  // if we are entering the route?
  const initializeIssueDetailStep = Option.match(maybeIssueId(model.route), {
    onNone: makeNoopStep,
    onSome: initializeIssueDetailIfMissingStep,
  })

  const initializeProjectChildStep = ApplicationRoute.matchOrElse(
    model.route,
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
