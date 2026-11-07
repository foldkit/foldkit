import { Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { makeInitIfMissingStep } from 'foldkit/binding'

import {
  IssueBoardsBinding,
  IssueDetailsBinding,
  ProjectSettingsBinding,
} from '../composition'
import { ApplicationRoute, maybeIssueId } from '../route'
import { maybeConfirmedIssue, maybeWorkspaceProject } from '../selectors'

const initSelectedIssueDetailIfMissing = makeInitIfMissingStep(
  IssueDetailsBinding,
  model =>
    pipe(
      maybeIssueId(model.route),
      Option.flatMap(issueId => maybeConfirmedIssue(model, issueId)),
      Option.map(issue => ({
        key: issue.id,
        args: [issue],
      })),
    ),
)

const initBoardIfMissing = makeInitIfMissingStep(IssueBoardsBinding, model => {
  const { route } = model

  if (!ApplicationRoute.guards.Board(route)) {
    return Option.none()
  }

  return pipe(
    maybeWorkspaceProject(model, route.projectId),
    Option.map(project => ({ key: project.id, args: [] })),
  )
})

const initProjectSettingsIfMissing = makeInitIfMissingStep(
  ProjectSettingsBinding,
  model => {
    const { route } = model

    if (!ApplicationRoute.guards.ProjectSettings(route)) {
      return Option.none()
    }

    return pipe(
      maybeWorkspaceProject(model, route.projectId),
      Option.map(project => ({ key: project.id, args: [project] })),
    )
  },
)

export const initRouteChildren = Update.combineSteps([
  initSelectedIssueDetailIfMissing,
  initBoardIfMissing,
  initProjectSettingsIfMissing,
])
