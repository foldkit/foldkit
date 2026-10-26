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
  type IssueDraft,
  type Project,
  type WorkspaceSnapshot,
  initialSnapshot,
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

const DEFAULT_LATENCY = 250

export class WorkspaceRepository extends Context.Service<
  WorkspaceRepository,
  Readonly<{
    load: Effect.Effect<
      typeof WorkspaceSnapshot.Type,
      typeof RepositoryError.Type
    >
    saveIssue: (
      input: typeof SaveIssueInput.Type,
    ) => Effect.Effect<typeof Issue.Type, typeof RepositoryError.Type>
    createIssue: (
      draft: typeof IssueDraft.Type,
    ) => Effect.Effect<typeof Issue.Type, typeof RepositoryError.Type>
    addComment: (
      input: typeof AddCommentInput.Type,
    ) => Effect.Effect<typeof Issue.Type, typeof RepositoryError.Type>
    moveIssue: (
      input: typeof MoveIssueInput.Type,
    ) => Effect.Effect<
      typeof WorkspaceSnapshot.Type,
      typeof RepositoryError.Type
    >
    saveProject: (
      project: typeof Project.Type,
    ) => Effect.Effect<typeof Project.Type, typeof RepositoryError.Type>
    failNext: (
      operation: typeof RepositoryOperation.Type,
    ) => Effect.Effect<void>
  }>
>()('workspace/WorkspaceRepository') {}

const consumeFailure = (
  pending: ReadonlyArray<typeof RepositoryOperation.Type>,
  operation: typeof RepositoryOperation.Type,
): Readonly<[boolean, ReadonlyArray<typeof RepositoryOperation.Type>]> => {
  const maybeIndex = Array.findFirstIndex(
    pending,
    failure => failure === operation,
  )

  return Option.match(maybeIndex, {
    onNone: () => [false, pending],
    onSome: index => [true, Array.remove(pending, index)],
  })
}

const makeWorkspaceRepository = (
  options: Readonly<{
    latency?: number
    initialSnapshot?: typeof WorkspaceSnapshot.Type
    failNext?: ReadonlyArray<typeof RepositoryOperation.Type>
  }>,
) =>
  Effect.gen(function* () {
    const state = yield* Ref.make(
      makeRepositoryState(options.initialSnapshot ?? initialSnapshot),
    )
    const failures = yield* Ref.make<
      ReadonlyArray<typeof RepositoryOperation.Type>
    >(options.failNext ?? [])
    const clock = yield* Clock.Clock
    const latency = options.latency ?? DEFAULT_LATENCY

    const checkAvailability = (operation: typeof RepositoryOperation.Type) =>
      Effect.gen(function* () {
        yield* Effect.sleep(latency)

        const isUnavailable = yield* Ref.modify(failures, pending =>
          consumeFailure(pending, operation),
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

      return (yield* Ref.get(state)).snapshot
    })

    const saveIssue = (input: typeof SaveIssueInput.Type) =>
      Effect.gen(function* () {
        yield* checkAvailability('Save')

        const saved = yield* Ref.modify(state, current =>
          saveIssueInState(current, input),
        )

        return yield* Effect.fromResult(saved)
      })

    const createIssue = (draft: typeof IssueDraft.Type) =>
      Effect.gen(function* () {
        yield* checkAvailability('Create')

        const created = yield* Ref.modify(state, current =>
          createIssueInState(current, draft),
        )

        return yield* Effect.fromResult(created)
      })

    const addComment = (input: typeof AddCommentInput.Type) =>
      Effect.gen(function* () {
        yield* checkAvailability('Comment')

        const createdAt = DateTime.formatIso(
          DateTime.makeUnsafe(yield* clock.currentTimeMillis),
        )
        const commented = yield* Ref.modify(state, current =>
          addCommentInState(current, input, createdAt),
        )

        return yield* Effect.fromResult(commented)
      })

    const moveIssue = (input: typeof MoveIssueInput.Type) =>
      Effect.gen(function* () {
        yield* checkAvailability('Move')

        const moved = yield* Ref.modify(state, current =>
          moveIssueInState(current, input),
        )

        return yield* Effect.fromResult(moved)
      })

    const saveProject = (project: typeof Project.Type) =>
      Effect.gen(function* () {
        yield* checkAvailability('Project')

        const saved = yield* Ref.modify(state, current =>
          saveProjectInState(current, project),
        )

        return yield* Effect.fromResult(saved)
      })

    return {
      load,
      saveIssue,
      createIssue,
      addComment,
      moveIssue,
      saveProject,
      failNext: (operation: typeof RepositoryOperation.Type) =>
        Ref.update(failures, Array.append(operation)),
    }
  })

export const makeWorkspaceRepositoryLayer = (
  options: Readonly<{
    latency?: number
    initialSnapshot?: typeof WorkspaceSnapshot.Type
    failNext?: ReadonlyArray<typeof RepositoryOperation.Type>
  }> = {},
) => Layer.effect(WorkspaceRepository, makeWorkspaceRepository(options))

export const WorkspaceRepositoryLayer = makeWorkspaceRepositoryLayer()
