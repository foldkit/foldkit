import {
  Array,
  Clock,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Ref,
} from 'effect'

import {
  type Issue,
  type Project,
  type Workspace,
  initialWorkspace,
} from '../domain'
import {
  addIssueCommentInState,
  createIssueInState,
  moveIssueInState,
  saveIssueInState,
} from './issue'
import { saveProjectInState } from './project'
import {
  type AddIssueCommentInput,
  type MoveIssueInput,
  RepositoryError,
  type RepositoryOperation,
  type SaveIssueInput,
} from './schema'
import { makeRepositoryState } from './state'

const DEFAULT_LATENCY_MS = 250

export class WorkspaceRepository extends Context.Service<
  WorkspaceRepository,
  Readonly<{
    load: Effect.Effect<Workspace.Workspace, RepositoryError>
    saveIssue: (
      input: SaveIssueInput,
    ) => Effect.Effect<Issue.SaveResult, RepositoryError>
    createIssue: (
      draft: Issue.Draft,
    ) => Effect.Effect<Issue.Issue, RepositoryError>
    addIssueComment: (
      input: AddIssueCommentInput,
    ) => Effect.Effect<Issue.Comment, RepositoryError>
    moveIssue: (
      input: MoveIssueInput,
    ) => Effect.Effect<Issue.MoveResult, RepositoryError>
    saveProject: (
      project: Project.Project,
    ) => Effect.Effect<Project.Project, RepositoryError>
    failNext: (operation: RepositoryOperation) => Effect.Effect<void>
  }>
>()('workspace/WorkspaceRepository') {}

const consumePendingFailure = (
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
    latencyMs?: number
    initialWorkspace?: Workspace.Workspace
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
    const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS

    const checkOperationAvailability = (operation: RepositoryOperation) =>
      Effect.gen(function* () {
        yield* Effect.sleep(latencyMs)

        const isUnavailable = yield* Ref.modify(
          pendingFailuresRef,
          pendingFailures => consumePendingFailure(pendingFailures, operation),
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
      yield* checkOperationAvailability('LoadWorkspace')

      return (yield* Ref.get(stateRef)).workspace
    })

    const saveIssue = (input: SaveIssueInput) =>
      Effect.gen(function* () {
        yield* checkOperationAvailability('SaveIssue')

        const saveResult = yield* Ref.modify(stateRef, currentState =>
          saveIssueInState(currentState, input),
        )

        return yield* Effect.fromResult(saveResult)
      })

    const createIssue = (draft: Issue.Draft) =>
      Effect.gen(function* () {
        yield* checkOperationAvailability('CreateIssue')

        const creationResult = yield* Ref.modify(stateRef, currentState =>
          createIssueInState(currentState, draft),
        )

        return yield* Effect.fromResult(creationResult)
      })

    const addIssueComment = (input: AddIssueCommentInput) =>
      Effect.gen(function* () {
        yield* checkOperationAvailability('AddIssueComment')

        const createdAt = DateTime.formatIso(
          DateTime.makeUnsafe(yield* clock.currentTimeMillis),
        )
        const commentResult = yield* Ref.modify(stateRef, currentState =>
          addIssueCommentInState(currentState, input, createdAt),
        )

        return yield* Effect.fromResult(commentResult)
      })

    const moveIssue = (input: MoveIssueInput) =>
      Effect.gen(function* () {
        yield* checkOperationAvailability('MoveIssue')

        const moveResult = yield* Ref.modify(stateRef, currentState =>
          moveIssueInState(currentState, input),
        )

        return yield* Effect.fromResult(moveResult)
      })

    const saveProject = (project: Project.Project) =>
      Effect.gen(function* () {
        yield* checkOperationAvailability('SaveProject')

        const saveResult = yield* Ref.modify(stateRef, currentState =>
          saveProjectInState(currentState, project),
        )

        return yield* Effect.fromResult(saveResult)
      })

    return {
      load,
      saveIssue,
      createIssue,
      addIssueComment,
      moveIssue,
      saveProject,
      failNext: (operation: RepositoryOperation) =>
        Ref.update(pendingFailuresRef, Array.append(operation)),
    }
  })

export const makeWorkspaceRepositoryLayer = (
  options: Readonly<{
    latencyMs?: number
    initialWorkspace?: Workspace.Workspace
    failNext?: ReadonlyArray<RepositoryOperation>
  }> = {},
) => Layer.effect(WorkspaceRepository, makeWorkspaceRepository(options))

export const WorkspaceRepositoryLayer = makeWorkspaceRepositoryLayer()
