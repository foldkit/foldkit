import { Array, Effect, Option, Result } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, it } from 'vitest'

import {
  Issue,
  IssueDraft,
  Project,
  Workspace,
  initialWorkspace,
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

const firstIssue = Option.getOrThrow(Array.head(initialWorkspace.issues))

describe('WorkspaceRepository', () => {
  it('loads the deterministic workspace workspace', async () => {
    const workspace = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository

        return yield* repository.load
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )

    expect(workspace).toEqual(initialWorkspace)
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

        const savedIssue = yield* repository.saveIssue({
          issueId: firstIssue.id,
          draft,
          expectedVersion: firstIssue.version,
        })
        const workspace = yield* repository.load

        const storedIssue = Issue.make({
          ...firstIssue,
          ...draft,
          version: firstIssue.version + 1,
        })

        expect(savedIssue).toEqual({
          issueId: firstIssue.id,
          identifier: firstIssue.identifier,
          revision: { fields: draft, version: firstIssue.version + 1 },
        })
        expect(
          Array.findFirst(
            workspace.issues,
            issue => issue.id === savedIssue.issueId,
          ),
        ).toEqual(Option.some(storedIssue))
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('consumes a configured failure once and allows retry', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const loadResult = yield* Effect.result(repository.load)

        expect(Result.isFailure(loadResult)).toBe(true)

        if (Result.isFailure(loadResult)) {
          expect(loadResult.failure).toMatchObject({
            _tag: 'Unavailable',
            operation: 'Load',
          })
        }

        const workspace = yield* repository.load

        expect(workspace).toEqual(initialWorkspace)
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

        const saveResult = yield* Effect.result(repository.saveIssue(input))
        const workspaceBeforeRetry = yield* repository.load

        expect(Result.isFailure(saveResult)).toBe(true)
        expect(workspaceBeforeRetry).toEqual(initialWorkspace)

        const savedIssue = yield* repository.saveIssue(input)

        expect(savedIssue.revision.fields.title).toBe(input.draft.title)
        expect(savedIssue.revision.version).toBe(firstIssue.version + 1)
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

        const savedIssue = yield* repository.saveIssue(input)
        const staleSaveResult = yield* Effect.result(
          repository.saveIssue({
            ...input,
            draft: IssueDraft.make({
              ...input.draft,
              title: 'An older edit',
            }),
          }),
        )
        const workspace = yield* repository.load

        expect(Result.isFailure(staleSaveResult)).toBe(true)

        if (Result.isFailure(staleSaveResult)) {
          expect(staleSaveResult.failure).toMatchObject({
            _tag: 'Conflict',
            expectedVersion: firstIssue.version,
            actualVersion: savedIssue.revision.version,
          })

          if (RepositoryError.guards.Conflict(staleSaveResult.failure)) {
            expect(staleSaveResult.failure.latestIssue).toStrictEqual({
              ...firstIssue,
              ...input.draft,
              version: savedIssue.revision.version,
            })
          }
        }

        expect(
          Array.findFirst(
            workspace.issues,
            issue => issue.id === savedIssue.issueId,
          ),
        ).toEqual(
          Option.some({
            ...firstIssue,
            ...input.draft,
            version: savedIssue.revision.version,
          }),
        )
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects creation in an unknown project without inserting or consuming an identity', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const creationResult = yield* Effect.result(
          repository.createIssue(
            IssueDraft.make({
              ...toDraft(firstIssue),
              projectId: 'missing-project',
            }),
          ),
        )
        const workspaceAfterFailure = yield* repository.load

        expect(creationResult).toEqual(
          Result.fail(
            RepositoryError.InvalidProject({
              message: 'Choose a project in this workspace.',
              projectId: 'missing-project',
            }),
          ),
        )
        expect(workspaceAfterFailure).toEqual(initialWorkspace)

        const createdIssue = yield* repository.createIssue(toDraft(firstIssue))

        expect(createdIssue.id).toBe('issue-117')
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects saving to an unknown project without changing fields or the revision', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const saveResult = yield* Effect.result(
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
        const workspaceAfterFailure = yield* repository.load

        expect(saveResult).toEqual(
          Result.fail(
            RepositoryError.InvalidProject({
              message: 'Choose a project in this workspace.',
              projectId: 'missing-project',
            }),
          ),
        )
        expect(workspaceAfterFailure).toEqual(initialWorkspace)

        const savedIssue = yield* repository.saveIssue({
          issueId: firstIssue.id,
          expectedVersion: firstIssue.version,
          draft: toDraft(firstIssue),
        })

        expect(savedIssue.revision.version).toBe(firstIssue.version + 1)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('creates unique increasing identities for concurrent requests', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const createdIssues = yield* Effect.all(
          Array.replicate(repository.createIssue(toDraft(firstIssue)), 3),
          { concurrency: 'unbounded' },
        )
        const workspace = yield* repository.load

        expect(Array.map(createdIssues, issue => issue.id)).toEqual([
          'issue-117',
          'issue-118',
          'issue-119',
        ])
        expect(Array.map(createdIssues, issue => issue.identifier)).toEqual([
          'WSP-117',
          'WSP-118',
          'WSP-119',
        ])
        expect(workspace.issues).toHaveLength(
          initialWorkspace.issues.length + createdIssues.length,
        )
        expect(Array.every(createdIssues, issue => issue.version === 1)).toBe(
          true,
        )
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('preserves new comments when saving fields from their original revision', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const createdComment = yield* repository.addComment({
          issueId: firstIssue.id,
          body: 'Ready for another review.',
          authorId: 'alex',
        })
        const savedIssue = yield* repository.saveIssue({
          issueId: firstIssue.id,
          draft: modifyFields(toDraft(firstIssue), {
            title: () => 'A revised title',
          }),
          expectedVersion: firstIssue.version,
        })
        const workspace = yield* repository.load

        expect(createdComment).toEqual({
          id: 'comment-5',
          authorId: 'alex',
          body: 'Ready for another review.',
          createdAt: expect.any(String),
        })
        expect(savedIssue.revision.version).toBe(firstIssue.version + 1)
        expect(savedIssue.revision.fields.title).toBe('A revised title')
        expect(
          Array.findFirst(
            workspace.issues,
            issue => issue.id === savedIssue.issueId,
          ),
        ).toEqual(
          Option.some({
            ...firstIssue,
            ...savedIssue.revision.fields,
            version: savedIssue.revision.version,
            comments: [...firstIssue.comments, createdComment],
          }),
        )
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('keeps state local to each Layer build', async () => {
    const RepositoryLayer = makeWorkspaceRepositoryLayer({ latency: 0 })
    const createIssueEffect = Effect.gen(function* () {
      const repository = yield* WorkspaceRepository

      return yield* repository.createIssue(toDraft(firstIssue))
    })

    const firstCreatedIssue = await Effect.runPromise(
      Effect.provide(createIssueEffect, RepositoryLayer),
    )
    const secondCreatedIssue = await Effect.runPromise(
      Effect.provide(createIssueEffect, RepositoryLayer),
    )

    expect(firstCreatedIssue.id).toBe('issue-117')
    expect(secondCreatedIssue.id).toBe(firstCreatedIssue.id)
  })

  it('moves within the source project target status while preserving other rows and workspace fields', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const movedIssue = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'Todo',
          insertionIndex: 1,
          expectedVersion: firstIssue.version,
        })
        const workspace = yield* repository.load
        const movedIssueSnapshot = Option.getOrThrow(
          Array.findFirst(
            workspace.issues,
            issue => issue.id === firstIssue.id,
          ),
        )

        expect(movedIssue).toStrictEqual({
          issueId: firstIssue.id,
          status: 'Todo',
          insertionIndex: 1,
          version: firstIssue.version + 1,
        })
        expect(movedIssueSnapshot).toStrictEqual({
          ...firstIssue,
          status: 'Todo',
          version: firstIssue.version + 1,
        })
        expect(
          Array.map(
            Array.filter(
              workspace.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'Todo',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-104', 'issue-101', 'issue-106'])
        expect(
          Array.filter(workspace.issues, issue => issue.id !== firstIssue.id),
        ).toStrictEqual(
          Array.filter(
            initialWorkspace.issues,
            issue => issue.id !== firstIssue.id,
          ),
        )
        expect(workspace.projects).toStrictEqual(initialWorkspace.projects)
        expect(workspace.members).toStrictEqual(initialWorkspace.members)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('reorders within a status in either direction using positions after source removal', async () => {
    const sameProjectWorkspace = Workspace.make({
      ...initialWorkspace,
      issues: Array.map(initialWorkspace.issues, issue =>
        issue.projectId === firstIssue.projectId && issue.status === 'Todo'
          ? Issue.make({ ...issue, status: 'InProgress' })
          : issue,
      ),
    })

    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const moveDownResult = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'InProgress',
          insertionIndex: 2,
          expectedVersion: firstIssue.version,
        })

        const workspaceAfterMoveDown = yield* repository.load

        expect(moveDownResult.insertionIndex).toBe(2)
        expect(
          Array.map(
            Array.filter(
              workspaceAfterMoveDown.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'InProgress',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-104', 'issue-106', 'issue-101'])

        const moveUpResult = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'InProgress',
          insertionIndex: 0,
          expectedVersion: firstIssue.version + 1,
        })
        const workspaceAfterMoveUp = yield* repository.load
        const movedIssueSnapshot = Option.getOrThrow(
          Array.findFirst(
            workspaceAfterMoveUp.issues,
            issue => issue.id === firstIssue.id,
          ),
        )

        expect(moveUpResult.insertionIndex).toBe(0)

        expect(
          Array.map(
            Array.filter(
              workspaceAfterMoveUp.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'InProgress',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-101', 'issue-104', 'issue-106'])
        expect(movedIssueSnapshot.version).toBe(firstIssue.version + 2)
        expect(
          Array.filter(
            workspaceAfterMoveUp.issues,
            issue => issue.id !== firstIssue.id,
          ),
        ).toStrictEqual(
          Array.filter(
            sameProjectWorkspace.issues,
            issue => issue.id !== firstIssue.id,
          ),
        )
      }).pipe(
        Effect.provide(
          makeWorkspaceRepositoryLayer({
            latency: 0,
            initialWorkspace: sameProjectWorkspace,
          }),
        ),
      ),
    )
  })

  it('returns the normalized destination index when the requested position is out of range', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const movedIssue = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'Todo',
          insertionIndex: 99,
          expectedVersion: firstIssue.version,
        })
        const workspace = yield* repository.load
        const targetIssues = Array.filter(
          workspace.issues,
          issue =>
            issue.projectId === firstIssue.projectId && issue.status === 'Todo',
        )

        expect(movedIssue).toEqual({
          issueId: firstIssue.id,
          status: 'Todo',
          insertionIndex: 2,
          version: firstIssue.version + 1,
        })
        expect(Array.map(targetIssues, issue => issue.id)).toEqual([
          'issue-104',
          'issue-106',
          firstIssue.id,
        ])
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects a stale move with the latest issue and preserves the current workspace', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const savedIssue = yield* repository.saveIssue({
          issueId: firstIssue.id,
          draft: IssueDraft.make({
            ...toDraft(firstIssue),
            title: 'A newer edit before the move',
          }),
          expectedVersion: firstIssue.version,
        })
        const workspaceBeforeMove = yield* repository.load
        const moveResult = yield* Effect.result(
          repository.moveIssue({
            issueId: firstIssue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: firstIssue.version,
          }),
        )
        const workspaceAfterMove = yield* repository.load

        expect(moveResult).toEqual(
          Result.fail(
            RepositoryError.Conflict({
              issueId: firstIssue.id,
              expectedVersion: firstIssue.version,
              actualVersion: savedIssue.revision.version,
              latestIssue: Option.getOrThrow(
                Array.findFirst(
                  workspaceBeforeMove.issues,
                  issue => issue.id === firstIssue.id,
                ),
              ),
              message:
                'The issue changed before it could be moved. Review it and retry.',
            }),
          ),
        )
        expect(workspaceAfterMove).toStrictEqual(workspaceBeforeMove)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects a move for a missing issue without changing the workspace', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const moveResult = yield* Effect.result(
          repository.moveIssue({
            issueId: 'missing-issue',
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: 1,
          }),
        )
        const workspace = yield* repository.load

        expect(moveResult).toEqual(
          Result.fail(
            RepositoryError.MissingIssue({
              issueId: 'missing-issue',
              message: 'This issue could not be found.',
            }),
          ),
        )
        expect(workspace).toStrictEqual(initialWorkspace)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('retries a failed move without consuming a revision or applying it twice', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository

        yield* repository.failNext('Move')

        const moveResult = yield* Effect.result(
          repository.moveIssue({
            issueId: firstIssue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: firstIssue.version,
          }),
        )
        const workspaceAfterFailure = yield* repository.load

        expect(moveResult).toEqual(
          Result.fail(
            RepositoryError.Unavailable({
              operation: 'Move',
              message:
                'The workspace is temporarily unavailable. Your changes are safe to retry.',
            }),
          ),
        )
        expect(workspaceAfterFailure).toStrictEqual(initialWorkspace)

        const movedIssue = yield* repository.moveIssue({
          issueId: firstIssue.id,
          status: 'Done',
          insertionIndex: 0,
          expectedVersion: firstIssue.version,
        })
        const workspace = yield* repository.load
        const movedIssueSnapshot = Option.getOrThrow(
          Array.findFirst(
            workspace.issues,
            issue => issue.id === firstIssue.id,
          ),
        )

        expect(movedIssue).toEqual({
          issueId: firstIssue.id,
          status: 'Done',
          insertionIndex: 0,
          version: firstIssue.version + 1,
        })
        expect(movedIssueSnapshot.status).toBe('Done')
        expect(movedIssueSnapshot.version).toBe(firstIssue.version + 1)
        expect(
          Array.map(
            Array.filter(
              workspace.issues,
              issue =>
                issue.projectId === firstIssue.projectId &&
                issue.status === 'Done',
            ),
            issue => issue.id,
          ),
        ).toEqual(['issue-101', 'issue-113'])
        expect(
          Array.filter(workspace.issues, issue => issue.id === firstIssue.id),
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

        const savedProject = yield* repository.saveProject(project)
        const workspace = yield* repository.load

        expect(savedProject).toStrictEqual(project)
        expect(Array.head(workspace.projects)).toEqual(Option.some(project))
        expect(Array.drop(workspace.projects, 1)).toStrictEqual(
          Array.drop(initialWorkspace.projects, 1),
        )
        expect(Array.map(workspace.projects, project => project.id)).toEqual(
          Array.map(initialWorkspace.projects, project => project.id),
        )
        expect(workspace.issues).toStrictEqual(initialWorkspace.issues)
        expect(workspace.members).toStrictEqual(initialWorkspace.members)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })

  it('rejects saving an unknown project without changing the workspace', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* WorkspaceRepository
        const saveResult = yield* Effect.result(
          repository.saveProject(
            Project.make({
              id: 'missing-project',
              name: 'Missing project',
              description: 'This project does not exist in the workspace.',
            }),
          ),
        )
        const workspace = yield* repository.load

        expect(saveResult).toEqual(
          Result.fail(
            RepositoryError.InvalidProject({
              projectId: 'missing-project',
              message: 'This project could not be found.',
            }),
          ),
        )
        expect(workspace).toStrictEqual(initialWorkspace)
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

        const saveResult = yield* Effect.result(repository.saveProject(project))
        const workspaceAfterFailure = yield* repository.load

        expect(saveResult).toEqual(
          Result.fail(
            RepositoryError.Unavailable({
              operation: 'Project',
              message:
                'The workspace is temporarily unavailable. Your changes are safe to retry.',
            }),
          ),
        )
        expect(workspaceAfterFailure).toStrictEqual(initialWorkspace)

        const savedProject = yield* repository.saveProject(project)
        const workspace = yield* repository.load

        expect(savedProject).toStrictEqual(project)
        expect(
          Array.findFirst(
            workspace.projects,
            candidate => candidate.id === project.id,
          ),
        ).toEqual(Option.some(project))
        expect(
          Array.filter(
            workspace.projects,
            candidate => candidate.id !== project.id,
          ),
        ).toStrictEqual(
          Array.filter(
            initialWorkspace.projects,
            candidate => candidate.id !== project.id,
          ),
        )
        expect(workspace.issues).toStrictEqual(initialWorkspace.issues)
      }).pipe(Effect.provide(makeWorkspaceRepositoryLayer({ latency: 0 }))),
    )
  })
})
