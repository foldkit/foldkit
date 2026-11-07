import { Array, Option, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'

import * as Issue from './issue'
import * as Member from './member'
import * as Project from './project'

export const Workspace = Schema.Struct({
  issues: Schema.Array(Issue.Issue),
  projects: Schema.Array(Project.Project),
  members: Schema.Array(Member.Member),
})
export type Workspace = typeof Workspace.Type

export const findIssue = (workspace: Workspace, issueId: string) =>
  Issue.findById(workspace.issues, issueId)

export const findProject = (workspace: Workspace, projectId: string) =>
  Project.findById(workspace.projects, projectId)

export const issuesForProject = (workspace: Workspace, projectId: string) =>
  Issue.forProject(workspace.issues, projectId)

export const issuesAssignedTo = (workspace: Workspace, memberId: string) =>
  Issue.assignedTo(workspace.issues, memberId)

export const withPendingMove = (
  workspace: Workspace,
  issueMoveState: Issue.MoveState,
) =>
  Issue.MoveState.matchOrElse(
    issueMoveState,
    {
      Moving: ({ issueId, status, insertionIndex }) =>
        modifyFields(workspace, {
          issues: issues => Issue.move(issues, issueId, status, insertionIndex),
        }),
    },
    () => workspace,
  )

export const replaceIssue = (workspace: Workspace, issue: Issue.Issue) =>
  Workspace.make({
    ...workspace,
    issues: Array.map(workspace.issues, currentIssue =>
      currentIssue.id === issue.id ? issue : currentIssue,
    ),
  })

export const replaceProject = (
  workspace: Workspace,
  project: Project.Project,
) =>
  Workspace.make({
    ...workspace,
    projects: Array.map(workspace.projects, currentProject =>
      currentProject.id === project.id ? project : currentProject,
    ),
  })

export const mergeIssueRevision = (
  workspace: Workspace,
  saveResult: Issue.SaveResult,
) =>
  modifyFields(workspace, {
    issues: Array.map(issue =>
      issue.id === saveResult.issueId
        ? Issue.mergeRevision(issue, saveResult.revision)
        : issue,
    ),
  })

export const addIssueComment = (
  workspace: Workspace,
  issueId: string,
  comment: Issue.Comment,
) =>
  modifyFields(workspace, {
    issues: Array.map(issue =>
      issue.id === issueId ? Issue.addComment(issue, comment) : issue,
    ),
  })

export const confirmIssueMove = (
  workspace: Workspace,
  moveResult: Issue.MoveResult,
) =>
  modifyFields(workspace, {
    issues: issues =>
      Option.match(Issue.findById(issues, moveResult.issueId), {
        onNone: () => issues,
        onSome: issue =>
          issue.version > moveResult.version
            ? issues
            : Issue.place(
                issues,
                modifyFields(issue, {
                  status: () => moveResult.status,
                  version: () => moveResult.version,
                }),
                moveResult.insertionIndex,
              ).issues,
      }),
  })
