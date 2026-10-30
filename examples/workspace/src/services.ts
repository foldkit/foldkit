import {
  Array,
  Clock,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
} from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import {
  Comment,
  Issue,
  IssueDraft,
  IssueStatus,
  MovedIssue,
  type Project,
  SavedIssue,
  Workspace,
  placeIssue,
} from './domain/domain'
import { revisionFromIssue } from './domain/issue'
import { initialWorkspace } from './domain/seed'

export const RepositoryOperation = Schema.Literals([
  'Load',
  'Save',
  'Create',
  'Comment',
  'Move',
  'Project',
])
export type RepositoryOperation = typeof RepositoryOperation.Type

export const RepositoryError = defineTaggedUnion({
  Unavailable: {
    message: Schema.String,
    operation: RepositoryOperation,
  },
  Conflict: {
    message: Schema.String,
    issueId: Schema.String,
    expectedVersion: Schema.Number,
    actualVersion: Schema.Number,
    latestIssue: Issue,
  },
  MissingIssue: { message: Schema.String, issueId: Schema.String },
  InvalidProject: { message: Schema.String, projectId: Schema.String },
})
export type RepositoryError = typeof RepositoryError.Type

export const SaveIssueInput = Schema.Struct({
  issueId: Schema.String,
  draft: IssueDraft,
  expectedVersion: Schema.Number,
})
export type SaveIssueInput = typeof SaveIssueInput.Type

export const AddCommentInput = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  authorId: Schema.String,
})
export type AddCommentInput = typeof AddCommentInput.Type

export const MoveIssueInput = Schema.Struct({
  issueId: Schema.String,
  status: IssueStatus,
  insertionIndex: Schema.Number,
  expectedVersion: Schema.Number,
})
export type MoveIssueInput = typeof MoveIssueInput.Type

const FIRST_ISSUE_NUMBER = 101

const RepositoryState = Schema.Struct({
  workspace: Workspace,
  nextIssueNumber: Schema.Number,
  nextCommentNumber: Schema.Number,
})
type RepositoryState = typeof RepositoryState.Type

type RepositoryTransition<Value> = Readonly<
  [Result.Result<Value, RepositoryError>, RepositoryState]
>

const makeRepositoryState = (workspace: Workspace) =>
  RepositoryState.make({
    workspace,
    nextIssueNumber: FIRST_ISSUE_NUMBER + workspace.issues.length,
    nextCommentNumber:
      Array.reduce(
        workspace.issues,
        0,
        (commentCount, issue) => commentCount + issue.comments.length,
      ) + 1,
  })

const findIssue = (state: RepositoryState, issueId: string) =>
  Array.findFirst(state.workspace.issues, issue => issue.id === issueId)

const hasProject = (state: RepositoryState, projectId: string) =>
  Array.some(state.workspace.projects, project => project.id === projectId)

const replaceIssue = (workspace: Workspace, issue: Issue) =>
  Workspace.make({
    ...workspace,
    issues: Array.map(workspace.issues, currentIssue =>
      currentIssue.id === issue.id ? issue : currentIssue,
    ),
  })

const findAvailableIssueNumber = (state: RepositoryState): number => {
  let issueNumber = state.nextIssueNumber

  while (
    Array.some(
      state.workspace.issues,
      issue =>
        issue.id === `issue-${issueNumber}` ||
        issue.identifier === `WSP-${issueNumber}`,
    )
  ) {
    issueNumber += 1
  }

  return issueNumber
}

const findAvailableCommentNumber = (state: RepositoryState): number => {
  let commentNumber = state.nextCommentNumber

  while (
    Array.some(state.workspace.issues, issue =>
      Array.some(
        issue.comments,
        comment => comment.id === `comment-${commentNumber}`,
      ),
    )
  ) {
    commentNumber += 1
  }

  return commentNumber
}

const saveIssueInState = (
  state: RepositoryState,
  input: SaveIssueInput,
): RepositoryTransition<SavedIssue> => {
  const maybeIssue = findIssue(state, input.issueId)

  if (Option.isNone(maybeIssue)) {
    return [
      Result.fail(
        RepositoryError.MissingIssue({
          message: 'This issue could not be found.',
          issueId: input.issueId,
        }),
      ),
      state,
    ]
  }

  const issue = maybeIssue.value

  if (issue.version !== input.expectedVersion) {
    return [
      Result.fail(
        RepositoryError.Conflict({
          message:
            'This issue changed since you opened it. Reload the latest version before saving.',
          issueId: issue.id,
          expectedVersion: input.expectedVersion,
          actualVersion: issue.version,
          latestIssue: issue,
        }),
      ),
      state,
    ]
  }

  if (!hasProject(state, input.draft.projectId)) {
    return [
      Result.fail(
        RepositoryError.InvalidProject({
          message: 'Choose a project in this workspace.',
          projectId: input.draft.projectId,
        }),
      ),
      state,
    ]
  }

  const nextIssue = Issue.make({
    ...issue,
    ...input.draft,
    version: issue.version + 1,
  })

  return [
    Result.succeed(
      SavedIssue.make({
        issueId: nextIssue.id,
        identifier: nextIssue.identifier,
        revision: revisionFromIssue(nextIssue),
      }),
    ),
    { ...state, workspace: replaceIssue(state.workspace, nextIssue) },
  ]
}

const createIssueInState = (
  state: RepositoryState,
  draft: IssueDraft,
): RepositoryTransition<Issue> => {
  if (!hasProject(state, draft.projectId)) {
    return [
      Result.fail(
        RepositoryError.InvalidProject({
          message: 'Choose a project in this workspace.',
          projectId: draft.projectId,
        }),
      ),
      state,
    ]
  }

  const issueNumber = findAvailableIssueNumber(state)
  const issue = Issue.make({
    ...draft,
    id: `issue-${issueNumber}`,
    identifier: `WSP-${issueNumber}`,
    version: 1,
    comments: [],
  })
  const nextWorkspace = Workspace.make({
    ...state.workspace,
    issues: Array.append(state.workspace.issues, issue),
  })

  return [
    Result.succeed(issue),
    { ...state, workspace: nextWorkspace, nextIssueNumber: issueNumber + 1 },
  ]
}

const addCommentInState = (
  state: RepositoryState,
  input: AddCommentInput,
  createdAt: string,
): RepositoryTransition<Comment> => {
  const maybeIssue = findIssue(state, input.issueId)

  if (Option.isNone(maybeIssue)) {
    return [
      Result.fail(
        RepositoryError.MissingIssue({
          message: 'This issue could not be found.',
          issueId: input.issueId,
        }),
      ),
      state,
    ]
  }

  const commentNumber = findAvailableCommentNumber(state)
  const issue = maybeIssue.value
  const comment = Comment.make({
    id: `comment-${commentNumber}`,
    authorId: input.authorId,
    body: input.body,
    createdAt,
  })
  const nextIssue = Issue.make({
    ...issue,
    comments: Array.append(issue.comments, comment),
  })

  return [
    Result.succeed(comment),
    {
      ...state,
      workspace: replaceIssue(state.workspace, nextIssue),
      nextCommentNumber: commentNumber + 1,
    },
  ]
}

const moveIssueInState = (
  state: RepositoryState,
  input: MoveIssueInput,
): RepositoryTransition<MovedIssue> => {
  const maybeIssue = findIssue(state, input.issueId)

  if (Option.isNone(maybeIssue)) {
    return [
      Result.fail(
        RepositoryError.MissingIssue({
          issueId: input.issueId,
          message: 'This issue could not be found.',
        }),
      ),
      state,
    ]
  }

  const issue = maybeIssue.value

  if (issue.version !== input.expectedVersion) {
    return [
      Result.fail(
        RepositoryError.Conflict({
          issueId: issue.id,
          expectedVersion: input.expectedVersion,
          actualVersion: issue.version,
          latestIssue: issue,
          message:
            'The issue changed before it could be moved. Review it and retry.',
        }),
      ),
      state,
    ]
  }

  const nextIssue = Issue.make({
    ...issue,
    status: input.status,
    version: issue.version + 1,
  })
  const nextWorkspace = Workspace.make({
    ...state.workspace,
    issues: placeIssue(state.workspace.issues, nextIssue, input.insertionIndex),
  })

  const targetIssues = Array.filter(
    nextWorkspace.issues,
    candidateIssue =>
      candidateIssue.projectId === nextIssue.projectId &&
      candidateIssue.status === nextIssue.status,
  )
  const insertionIndex = Option.getOrThrow(
    Array.findFirstIndex(
      targetIssues,
      candidateIssue => candidateIssue.id === nextIssue.id,
    ),
  )

  return [
    Result.succeed(
      MovedIssue.make({
        issueId: nextIssue.id,
        status: nextIssue.status,
        insertionIndex,
        version: nextIssue.version,
      }),
    ),
    { ...state, workspace: nextWorkspace },
  ]
}

const saveProjectInState = (
  state: RepositoryState,
  project: Project,
): RepositoryTransition<Project> => {
  if (!hasProject(state, project.id)) {
    return [
      Result.fail(
        RepositoryError.InvalidProject({
          projectId: project.id,
          message: 'This project could not be found.',
        }),
      ),
      state,
    ]
  }

  const nextWorkspace = Workspace.make({
    ...state.workspace,
    projects: Array.map(state.workspace.projects, currentProject =>
      currentProject.id === project.id ? project : currentProject,
    ),
  })

  return [Result.succeed(project), { ...state, workspace: nextWorkspace }]
}

const DEFAULT_LATENCY_MS = 250

export class WorkspaceRepository extends Context.Service<
  WorkspaceRepository,
  Readonly<{
    load: Effect.Effect<Workspace, RepositoryError>
    saveIssue: (
      input: SaveIssueInput,
    ) => Effect.Effect<SavedIssue, RepositoryError>
    createIssue: (draft: IssueDraft) => Effect.Effect<Issue, RepositoryError>
    addComment: (
      input: AddCommentInput,
    ) => Effect.Effect<Comment, RepositoryError>
    moveIssue: (
      input: MoveIssueInput,
    ) => Effect.Effect<MovedIssue, RepositoryError>
    saveProject: (project: Project) => Effect.Effect<Project, RepositoryError>
    failNext: (operation: RepositoryOperation) => Effect.Effect<void>
  }>
>()('workspace/WorkspaceRepository') {}

const consumeFailure = (
  pendingFailures: ReadonlyArray<RepositoryOperation>,
  operation: RepositoryOperation,
): Readonly<[boolean, ReadonlyArray<RepositoryOperation>]> => {
  const maybeFailureIndex = Array.findFirstIndex(
    pendingFailures,
    failure => failure === operation,
  )

  return Option.match(maybeFailureIndex, {
    onNone: () => [false, pendingFailures],
    onSome: index => [true, Array.remove(pendingFailures, index)],
  })
}

const makeWorkspaceRepository = (
  options: Readonly<{
    latency?: number
    initialWorkspace?: Workspace
    failNext?: ReadonlyArray<RepositoryOperation>
  }>,
) =>
  Effect.gen(function* () {
    const stateRef = yield* Ref.make(
      makeRepositoryState(options.initialWorkspace ?? initialWorkspace),
    )
    const pendingFailuresRef = yield* Ref.make<
      ReadonlyArray<RepositoryOperation>
    >(options.failNext ?? [])
    const clock = yield* Clock.Clock
    const latencyMs = options.latency ?? DEFAULT_LATENCY_MS

    const checkAvailability = (operation: RepositoryOperation) =>
      Effect.gen(function* () {
        yield* Effect.sleep(latencyMs)

        const isUnavailable = yield* Ref.modify(
          pendingFailuresRef,
          pendingFailures => consumeFailure(pendingFailures, operation),
        )

        if (isUnavailable) {
          return yield* Effect.fail(
            RepositoryError.Unavailable({
              message:
                'The workspace is temporarily unavailable. Your changes are safe to retry.',
              operation,
            }),
          )
        }
      })

    const load = Effect.gen(function* () {
      yield* checkAvailability('Load')

      return (yield* Ref.get(stateRef)).workspace
    })

    const saveIssue = (input: SaveIssueInput) =>
      Effect.gen(function* () {
        yield* checkAvailability('Save')

        const saveResult = yield* Ref.modify(stateRef, currentState =>
          saveIssueInState(currentState, input),
        )

        return yield* Effect.fromResult(saveResult)
      })

    const createIssue = (draft: IssueDraft) =>
      Effect.gen(function* () {
        yield* checkAvailability('Create')

        const creationResult = yield* Ref.modify(stateRef, currentState =>
          createIssueInState(currentState, draft),
        )

        return yield* Effect.fromResult(creationResult)
      })

    const addComment = (input: AddCommentInput) =>
      Effect.gen(function* () {
        yield* checkAvailability('Comment')

        const createdAt = DateTime.formatIso(
          DateTime.makeUnsafe(yield* clock.currentTimeMillis),
        )
        const commentResult = yield* Ref.modify(stateRef, currentState =>
          addCommentInState(currentState, input, createdAt),
        )

        return yield* Effect.fromResult(commentResult)
      })

    const moveIssue = (input: MoveIssueInput) =>
      Effect.gen(function* () {
        yield* checkAvailability('Move')

        const moveResult = yield* Ref.modify(stateRef, currentState =>
          moveIssueInState(currentState, input),
        )

        return yield* Effect.fromResult(moveResult)
      })

    const saveProject = (project: Project) =>
      Effect.gen(function* () {
        yield* checkAvailability('Project')

        const saveResult = yield* Ref.modify(stateRef, currentState =>
          saveProjectInState(currentState, project),
        )

        return yield* Effect.fromResult(saveResult)
      })

    return {
      load,
      saveIssue,
      createIssue,
      addComment,
      moveIssue,
      saveProject,
      failNext: (operation: RepositoryOperation) =>
        Ref.update(pendingFailuresRef, Array.append(operation)),
    }
  })

export const makeWorkspaceRepositoryLayer = (
  options: Readonly<{
    latency?: number
    initialWorkspace?: Workspace
    failNext?: ReadonlyArray<RepositoryOperation>
  }> = {},
) => Layer.effect(WorkspaceRepository, makeWorkspaceRepository(options))

export const WorkspaceRepositoryLayer = makeWorkspaceRepositoryLayer()

export const ApplicationLayer = WorkspaceRepositoryLayer
