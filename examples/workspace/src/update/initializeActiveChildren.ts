import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  IssueBoardBinding,
  IssueDetailBinding,
  ProjectSettingsBinding,
} from '../composition'
import { ApplicationDefinition } from '../definition'
import { backgroundRoute } from '../navigation'
import { ApplicationRoute } from '../route'

const initializeIssueDetailIfMissing = (issueId: string) =>
  ApplicationDefinition.makeStep(model => {
    if (
      Array.some(
        model.issueDetailInstances,
        instance => instance.issueId === issueId,
      )
    ) {
      return { model }
    }

    return Option.match(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
        Array.findFirst(snapshot.issues, issue => issue.id === issueId),
      ),
      {
        onNone: () => ({ model }),
        onSome: issue =>
          IssueDetailBinding.init({
            key: issueId,
            args: [
              issue,
              Array.findFirst(
                model.issueDrafts,
                draft => draft.issueId === issueId,
              ),
            ],
            toParentModel: issueDetail =>
              modifyFields(model, {
                issueDetailInstances: Array.append({
                  issueId,
                  model: issueDetail,
                }),
              }),
          }),
      },
    )
  })

const initializeProjectBoardIfMissing = (projectId: string) =>
  ApplicationDefinition.makeStep(model => {
    if (
      Array.some(
        model.boardInstances,
        instance => instance.projectId === projectId,
      )
    ) {
      return { model }
    }

    const maybeProject = Option.flatMap(
      AsyncData.getData(model.workspaceAsyncData),
      snapshot =>
        Array.findFirst(snapshot.projects, project => project.id === projectId),
    )

    return Option.match(maybeProject, {
      onNone: () => ({ model }),
      onSome: () =>
        IssueBoardBinding.init({
          key: projectId,
          args: [],
          toParentModel: board =>
            modifyFields(model, {
              boardInstances: Array.append({ projectId, model: board }),
            }),
        }),
    })
  })

const initializeProjectSettingsIfMissing = (projectId: string) =>
  ApplicationDefinition.makeStep(model => {
    if (
      Array.some(
        model.projectSettingsInstances,
        instance => instance.projectId === projectId,
      )
    ) {
      return { model }
    }

    return Option.match(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
        Array.findFirst(snapshot.projects, project => project.id === projectId),
      ),
      {
        onNone: () => ({ model }),
        onSome: project =>
          ProjectSettingsBinding.init({
            key: project.id,
            args: [project],
            toParentModel: settings =>
              modifyFields(model, {
                projectSettingsInstances: Array.append({
                  projectId: project.id,
                  model: settings,
                }),
              }),
          }),
      },
    )
  })

export const initializeActiveChildren = ApplicationDefinition.makeStep(
  model => {
    const issueDetail = ApplicationRoute.matchOrElse(
      model.route,
      { Issue: ({ issueId }) => initializeIssueDetailIfMissing(issueId) },
      ApplicationDefinition.makeNoopStep,
    )

    const route = backgroundRoute(model.route)
    const projectChild = ApplicationRoute.matchOrElse(
      route,
      {
        Board: ({ projectId }) => initializeProjectBoardIfMissing(projectId),
        ProjectSettings: ({ projectId }) =>
          initializeProjectSettingsIfMissing(projectId),
      },
      ApplicationDefinition.makeNoopStep,
    )

    return Update.combineSteps([issueDetail, projectChild])
  },
)
