import { Array, Effect, Option, Result } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, it } from 'vitest'

import {
  Issue,
  IssueDraft,
  Project,
  WorkspaceSnapshot,
  initialSnapshot,
} from '../domain'
import {
  RepositoryError,
  WorkspaceRepository,
  makeWorkspaceRepositoryLayer,
} from './index'

const toDraft = (issue: typeof Issue.Type) =>
  IssueDraft.make({
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    projectId: issue.projectId,
    maybeAssigneeId: issue.maybeAssigneeId,
    labelIds: issue.labelIds,
  })

const firstIssue = Option.getOrThrow(Array.head(initialSnapshot.issues))

describe('WorkspaceRepository', () => {
  it('loads the deterministic workspace snapshot', async () => {
    const snapshot = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository

        return yield* repository.load
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )

    expect(snapshot).toEqual(initialSnapshot)
  })

  it('saves fields and preserves issue identity and comments', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const draft = IssueDraft.make({
          ...toDraft(firstIssue),
          title: 'Ship a faster command menu',
          status: 'Done',
          maybeAssigneeId: Option.none(),
        })

        const saved = yield* repository.saveIssue({
          issueId: firstIssue.id,
          draft,
          expectedVersion: firstIssue.version,
        })
        const snapshot = yield* repository.load

        expect(saved).toEqual({
          ...firstIssue,
          ...draft,
          version: firstIssue.version + 1,
        })
        expect(
          Array.findFirst(snapshot.issues, issue => issue.id === saved.id),
        ).toEqual(Option.some(saved))
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('consumes a configured failure once and allows retry', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const failed = yield* Effect.result(repository.load)

        expect(Result.isFailure(failed)).toBe(true)

        if (Result.isFailure(failed)) {
          expect(failed.failure).toMatchObject({
            _tag: 'Unavailable',
            operation: 'Load',
          })
        }

        const snapshot = yield* repository.load

        expect(snapshot).toEqual(initialSnapshot)
      }).pipe(
        Effect.provide(
          makeWorkspaceRepositoryLayer({
            latency: 0,
            failNext: ['Load'],
          }),
        ),
      ),
    )
  })

  it('preserves the stored revision when a demo failure interrupts saving', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const input = {
          issueId: firstIssue.id,
          draft: IssueDraft.make({
            ...toDraft(firstIssue),
            title: 'Keep this draft through retry',
          }),
          expectedVersion: firstIssue.version,
        }

        yield* repository.failNext('Save')

        const failed = yield* Effect.result(repository.saveIssue(input))
        const beforeRetry = yield* repository.load

        expect(Result.isFailure(failed)).toBe(true)
        expect(beforeRetry).toEqual(initialSnapshot)

        const saved = yield* repository.saveIssue(input)

        expect(saved.title).toBe(input.draft.title)
        expect(saved.version).toBe(firstIssue.version + 1)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects stale saves without overwriting the current issue', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const input = {
          issueId: firstIssue.id,
          draft: IssueDraft.make({
            ...toDraft(firstIssue),
            title: 'The latest edit',
          }),
          expectedVersion: firstIssue.version,
        }

        const saved = yield* repository.saveIssue(input)
        const staleSave = yield* Effect.result(
          repository.saveIssue({
            ...input,
            draft: IssueDraft.make({
              ...input.draft,
              title: 'An older edit',
            }),
          }),
        )
        const snapshot = yield* repository.load

        expect(Result.isFailure(staleSave)).toBe(true)

        if (Result.isFailure(staleSave)) {
          expect(staleSave.failure).toMatchObject({
            _tag: 'Conflict',
            expectedVersion: firstIssue.version,
            actualVersion: saved.version,
          })

          if (RepositoryError.guards.Conflict(staleSave.failure)) {
            expect(staleSave.failure.latestIssue).toStrictEqual(saved)
          }
        }

        expect(
          Array.findFirst(snapshot.issues, issue => issue.id === saved.id),
        ).toEqual(Option.some(saved))
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects creation in an unknown project without inserting or consuming an identity', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const failed = yield* Effect.result(
          repository.createIssue(
            IssueDraft.make({
              ...toDraft(firstIssue),
              projectId: 'missing-project',
            }),
          ),
        )
        const afterFailure = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.InvalidProject({
              message: 'Choose a project in this workspace.',
              projectId: 'missing-project',
            }),
          ),
        )
        expect(afterFailure).toEqual(initialSnapshot)

        const created = yield* repository.createIssue(toDraft(firstIssue))

        expect(created.id).toBe('issue-117')
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects saving to an unknown project without changing fields or the revision', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const failed = yield* Effect.result(
          repository.saveIssue({
            issueId: firstIssue.id,
            expectedVersion: firstIssue.version,
            draft: IssueDraft.make({
              ...toDraft(firstIssue),
              title: 'This edit must not be stored',
              projectId: 'missing-project',
            }),
          }),
        )
        const afterFailure = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.InvalidProject({
              message: 'Choose a project in this workspace.',
              projectId: 'missing-project',
            }),
          ),
        )
        expect(afterFailure).toEqual(initialSnapshot)

        const saved = yield* repository.saveIssue({
          issueId: firstIssue.id,
          expectedVersion: firstIssue.version,
          draft: toDraft(firstIssue),
        })

        expect(saved.version).toBe(firstIssue.version + 1)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('creates unique increasing identities for concurrent requests', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const created = yield* Effect.all(
          Array.replicate(repository.createIssue(toDraft(firstIssue)), 3),
          { concurrency: 'unbounded' },
        )
        const snapshot = yield* repository.load

        expect(Array.map(created, issue => issue.id)).toEqual([
          'issue-117',
          'issue-118',
          'issue-119',
        ])
        expect(Array.map(created, issue => issue.identifier)).toEqual([
          'WSP-117',
          'WSP-118',
          'WSP-119',
        ])
        expect(snapshot.issues).toHaveLength(
          initialSnapshot.issues.length + created.length,
        )
        expect(Array.every(created, issue => issue.version === 1)).toBe(true)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('preserves new comments when saving fields from their original revision', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const commented = yield* repository.addComment({
          issueId: firstIssue.id,
          body: 'Ready for another review.',
          authorId: 'alex',
        })
        const saved = yield* repository.saveIssue({
          issueId: firstIssue.id,
          draft: modifyFields(toDraft(firstIssue), {
            title: () => 'A revised title',
          }),
          expectedVersion: firstIssue.version,
        })
        const snapshot = yield* repository.load

        expect(commented.version).toBe(firstIssue.version)
        expect(saved.version).toBe(firstIssue.version + 1)
        expect(saved.comments).toEqual(commented.comments)
        expect(saved.title).toBe('A revised title')
        expect(
          Array.findFirst(snapshot.issues, issue => issue.id === saved.id),
        ).toEqual(Option.some(saved))
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('keeps state local to each Layer build', async () => {
    const RepositoryLayer = makeWorkspaceRepositoryLayer({ latency: 0 })
    const write = Effect.gen(function* () {
      const repository = yield* WorkspaceRepository

      return yield* repository.createIssue(toDraft(firstIssue))
    })

    const first = await Effect.runPromise(
      Effect.provide(write, RepositoryLayer),
    )
    const second = await Effect.runPromise(
      Effect.provide(write, RepositoryLayer),
    )

    expect(first.id).toBe('issue-117')
    expect(second.id).toBe(first.id)
  })

  it('moves within the source project target status while preserving other rows and snapshot fields', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const moved = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'Todo',
          insertionIndex: 1,
          expectedVersion: firstIssue.version,
        })
        const snapshot = yield* repository.load
        const movedIssue = Option.getOrThrow(
          Array.findFirst(moved.issues, issue => issue.id === firstIssue.id),
        )

        expect(movedIssue).toStrictEqual({
          ...firstIssue,
          status: 'Todo',
          version: firstIssue.version + 1,
        })
        expect(
          Array.map(
            Array.filter(
              moved.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'Todo',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-104', 'issue-101', 'issue-106'])
        expect(
          Array.filter(moved.issues, issue => issue.id !== firstIssue.id),
        ).toStrictEqual(
          Array.filter(
            initialSnapshot.issues,
            issue => issue.id !== firstIssue.id,
          ),
        )
        expect(moved.projects).toStrictEqual(initialSnapshot.projects)
        expect(moved.members).toStrictEqual(initialSnapshot.members)
        expect(snapshot).toStrictEqual(moved)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('reorders within a status in either direction using positions after source removal', async () => {
    const sameProjectSnapshot = WorkspaceSnapshot.make({
      ...initialSnapshot,
      issues: Array.map(initialSnapshot.issues, issue =>
        issue.projectId === firstIssue.projectId && issue.status === 'Todo'
          ? Issue.make({ ...issue, status: 'InProgress' })
          : issue,
      ),
    })

    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const movedDown = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'InProgress',
          insertionIndex: 2,
          expectedVersion: firstIssue.version,
        })

        expect(
          Array.map(
            Array.filter(
              movedDown.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'InProgress',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-104', 'issue-106', 'issue-101'])

        const movedUp = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'InProgress',
          insertionIndex: 0,
          expectedVersion: firstIssue.version + 1,
        })
        const movedIssue = Option.getOrThrow(
          Array.findFirst(movedUp.issues, issue => issue.id === firstIssue.id),
        )

        expect(
          Array.map(
            Array.filter(
              movedUp.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'InProgress',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-101', 'issue-104', 'issue-106'])
        expect(movedIssue.version).toBe(firstIssue.version + 2)
        expect(
          Array.filter(movedUp.issues, issue => issue.id !== firstIssue.id),
        ).toStrictEqual(
          Array.filter(
            sameProjectSnapshot.issues,
            issue => issue.id !== firstIssue.id,
          ),
        )
      }).pipe(
        Effect.provide(
          makeWorkspaceRepositoryLayer({
            latency: 0,
            initialSnapshot: sameProjectSnapshot,
          }),
        ),
      ),
    )
  })

  it('rejects a stale move with the latest issue and preserves the current snapshot', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const saved = yield* repository.saveIssue({
          issueId: firstIssue.id,
          draft: IssueDraft.make({
            ...toDraft(firstIssue),
            title: 'A newer edit before the move',
          }),
          expectedVersion: firstIssue.version,
        })
        const beforeMove = yield* repository.load
        const failed = yield* Effect.result(
          repository.moveIssue({
            issueId: firstIssue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: firstIssue.version,
          }),
        )
        const afterMove = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.Conflict({
              issueId: firstIssue.id,
              expectedVersion: firstIssue.version,
              actualVersion: saved.version,
              latestIssue: saved,
              message:
                'The issue changed before it could be moved. Review it and retry.',
            }),
          ),
        )
        expect(afterMove).toStrictEqual(beforeMove)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects a move for a missing issue without changing the snapshot', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const failed = yield* Effect.result(
          repository.moveIssue({
            issueId: 'missing-issue',
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: 1,
          }),
        )
        const snapshot = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.MissingIssue({
              issueId: 'missing-issue',
              message: 'This issue could not be found.',
            }),
          ),
        )
        expect(snapshot).toStrictEqual(initialSnapshot)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('retries a failed move without consuming a revision or applying it twice', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository

        yield* repository.failNext('Move')

        const failed = yield* Effect.result(
          repository.moveIssue({
            issueId: firstIssue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: firstIssue.version,
          }),
        )
        const afterFailure = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.Unavailable({
              operation: 'Move',
              message:
                'The workspace is temporarily unavailable. Your changes are safe to retry.',
            }),
          ),
        )
        expect(afterFailure).toStrictEqual(initialSnapshot)

        const moved = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'Done',
          insertionIndex: 0,
          expectedVersion: firstIssue.version,
        })
        const movedIssue = Option.getOrThrow(
          Array.findFirst(moved.issues, issue => issue.id === firstIssue.id),
        )

        expect(movedIssue.status).toBe('Done')
        expect(movedIssue.version).toBe(firstIssue.version + 1)
        expect(
          Array.map(
            Array.filter(
              moved.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'Done',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-101', 'issue-113'])
        expect(
          Array.filter(moved.issues, issue => issue.id === firstIssue.id),
        ).toHaveLength(1)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('updates only the selected project and preserves project order and issue data', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const project = Project.make({
          id: 'platform',
          name: 'Core Platform',
          description: 'Reliable foundations for every team.',
        })

        const saved = yield* repository.saveProject(project)
        const snapshot = yield* repository.load

        expect(saved).toStrictEqual(project)
        expect(Array.head(snapshot.projects)).toEqual(Option.some(project))
        expect(Array.drop(snapshot.projects, 1)).toStrictEqual(
          Array.drop(initialSnapshot.projects, 1),
        )
        expect(Array.map(snapshot.projects, project => project.id)).toEqual(
          Array.map(initialSnapshot.projects, project => project.id),
        )
        expect(snapshot.issues).toStrictEqual(initialSnapshot.issues)
        expect(snapshot.members).toStrictEqual(initialSnapshot.members)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects saving an unknown project without changing the snapshot', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const failed = yield* Effect.result(
          repository.saveProject(
            Project.make({
              id: 'missing-project',
              name: 'Missing project',
              description: 'This project does not exist in the workspace.',
            }),
          ),
        )
        const snapshot = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.InvalidProject({
              projectId: 'missing-project',
              message: 'This project could not be found.',
            }),
          ),
        )
        expect(snapshot).toStrictEqual(initialSnapshot)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('preserves the project after a failed save and accepts the same edit on retry', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const project = Project.make({
          id: 'experience',
          name: 'Product Experience',
          description: 'Make everyday work easier to follow.',
        })

        yield* repository.failNext('Project')

        const failed = yield* Effect.result(repository.saveProject(project))
        const afterFailure = yield* repository.load

        expect(failed).toEqual(
          Result.fail(
            RepositoryError.Unavailable({
              operation: 'Project',
              message:
                'The workspace is temporarily unavailable. Your changes are safe to retry.',
            }),
          ),
        )
        expect(afterFailure).toStrictEqual(initialSnapshot)

        const saved = yield* repository.saveProject(project)
        const snapshot = yield* repository.load

        expect(saved).toStrictEqual(project)
        expect(
          Array.findFirst(
            snapshot.projects,
            candidate => candidate.id === project.id,
          ),
        ).toEqual(Option.some(project))
        expect(
          Array.filter(
            snapshot.projects,
            candidate => candidate.id !== project.id,
          ),
        ).toStrictEqual(
          Array.filter(
            initialSnapshot.projects,
            candidate => candidate.id !== project.id,
          ),
        )
        expect(snapshot.issues).toStrictEqual(initialSnapshot.issues)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })
})
