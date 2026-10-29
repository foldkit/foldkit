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
  type Comment,
  type Issue,
  type IssueDraft,
  type MovedIssue,
  type Project,
  type SavedIssue,
  type Workspace,
  initialWorkspace,
} from '../domain'
import {
  addCommentInState,
  createIssueInState,
  moveIssueInState,
  saveIssueInState,
} from './issue'
import { saveProjectInState } from './project'
import {
  type AddCommentInput,
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
