import { Array, Number, Option } from 'effect'
import { AsyncData, Block } from 'foldkit'
import {
  Command,
  type StorySimulation,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import { Message } from '../application'
import {
  type ResolvedModel,
  activeIssueBoard,
  activeIssueDetail,
  application,
  issueDetailMessage,
  issueMoveMessage,
  loadWorkspace,
  startAt,
  teammateActivityMessage,
  url,
  visibleWorkspaceOf,
} from '../application.fixture'
import { Comment, type Issue, type IssueStatus } from '../domain/domain'
import {
  draftFromIssue,
  revisionFromIssue,
  savedIssueFromIssue,
} from '../domain/issue'
import { initialWorkspace } from '../domain/seed'
import { containerId, draggableId } from '../issueBoard'
import { IssueDetail } from '../issueDetail/issueDetail'
import { SaveIssue } from '../issueDetail/issueDetail'
import { IssueMove, MoveIssue } from '../issueMove'
import { IssueMoveState } from '../issueMove'
import { issueRouter } from '../route'
import { RepositoryError } from '../services'
import { TeammateActivity } from '../teammateActivity'

type DragAndDropMessage = typeof DragAndDrop.DragAndDrop.Message.Type

const boardPath = '/projects/platform/board'

const visibleIssueOf = (model: ResolvedModel, issueId: string) =>
  Option.getOrThrow(
    Array.findFirst(
      visibleWorkspaceOf(model).issues,
      issue => issue.id === issueId,
    ),
  )

const visibleIssueIds = (model: ResolvedModel) =>
  Array.map(visibleWorkspaceOf(model).issues, issue => issue.id)

const initialIssue = (issueId: string) =>
  Option.getOrThrow(
    Array.findFirst(initialWorkspace.issues, issue => issue.id === issueId),
  )

const initialVisibleIssueIds = Array.map(
  initialWorkspace.issues,
  issue => issue.id,
)

const modifyModel =
  (f: (model: ResolvedModel) => ResolvedModel) =>
  (simulation: StorySimulation<ResolvedModel, unknown, unknown>) =>
    given(f(simulation.model))(simulation)

const withPendingIssueMove = (
  issueId: string,
  status: IssueStatus,
  insertionIndex: number,
) =>
  modifyModel(model =>
    modifyFields(model, {
      issueMove: issueMove =>
        modifyFields(issueMove, {
          state: () =>
            IssueMoveState.MovingIssue({
              issueId,
              status,
              insertionIndex,
              expectedVersion: visibleIssueOf(model, issueId).version,
            }),
        }),
    }),
  )

const withWorkspaceIssue = (issue: Issue) =>
  modifyModel(model =>
    modifyFields(model, {
      workspaceAsyncData: AsyncData.map(workspace =>
        modifyFields(workspace, {
          issues: Array.map(current =>
            current.id === issue.id ? issue : current,
          ),
        }),
      ),
    }),
  )

describe('Board moves', () => {
  it.effect(
    'opens an editor from confirmed fields while a board move is pending',
    () => {
      const issue = initialIssue('issue-103')
      const title = 'A title edited after a failed move'

      return story(
        application,
        startAt(boardPath),
        loadWorkspace,
        withPendingIssueMove(issue.id, 'Done', 0),
        message(
          Message.ChangedUrl({ url: url(issueRouter({ issueId: issue.id })) }),
        ),
        model(model => {
          expect(visibleIssueOf(model, issue.id).status).toBe('Done')
          expect(activeIssueDetail(model).baseline).toEqual(
            revisionFromIssue(issue),
          )
          expect(activeIssueDetail(model).draft).toEqual(draftFromIssue(issue))
        }),
        message(
          issueMoveMessage(
            IssueMove.Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'Offline',
              }),
            }),
          ),
        ),
        model(model => {
          expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
          expect(activeIssueDetail(model).draft.status).toBe(issue.status)
        }),
        message(
          issueDetailMessage(
            issue.id,
            IssueDetail.Message.UpdatedTitle({ value: title }),
          ),
        ),
        message(
          issueDetailMessage(issue.id, IssueDetail.Message.RequestedSave()),
        ),
        Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            draft: modifyFields(draftFromIssue(issue), { title: () => title }),
          }),
        ),
        Command.resolve(
          SaveIssue,
          IssueDetail.Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(
              modifyFields(issue, {
                title: () => title,
                version: Number.increment,
              }),
            ),
            expectedVersion: issue.version,
          }),
        ),
        model(model => {
          expect(visibleIssueOf(model, issue.id).title).toBe(title)
          expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
        }),
      )
    },
  )

  it.effect(
    'retains a teammate comment between an optimistic move and its rollback',
    () => {
      const issue = initialIssue('issue-103')
      const teammateComment = Comment.make({
        id: 'comment-during-move',
        authorId: 'maya',
        body: 'This arrived while the move was being saved.',
        createdAt: '2026-10-24T16:00:00.000Z',
      })
      const commentedIssue = modifyFields(issue, {
        comments: Array.append(teammateComment),
      })
      const itemId = draggableId(issue.id)
      const dragAndDropPath = ['issueBoards', issue.projectId, 'dragAndDrop']

      const dragMessage = (childMessage: DragAndDropMessage) =>
        Block.deliver(DragAndDrop.DragAndDrop, dragAndDropPath, childMessage)

      return story(
        application,
        startAt(boardPath),
        loadWorkspace,
        message(
          dragMessage(
            DragAndDrop.DragAndDrop.Message.ActivatedKeyboardDrag({
              itemId,
              containerId: containerId(issue.status),
              index: 0,
            }),
          ),
        ),
        message(
          dragMessage(
            DragAndDrop.DragAndDrop.Message.PressedArrowKey({
              direction: 'NextContainer',
            }),
          ),
        ),
        DragAndDrop.test.resolveKeyboardMove({
          path: dragAndDropPath,
          itemId,
          targetContainerId: containerId('Done'),
          targetIndex: 0,
        }),
        message(
          dragMessage(DragAndDrop.DragAndDrop.Message.ConfirmedKeyboardDrop()),
        ),
        DragAndDrop.test.settleFocus({ path: dragAndDropPath, itemId }),
        model(model => {
          expect(visibleIssueOf(model, issue.id).status).toBe('Done')
          expect(
            Option.getOrThrow(AsyncData.getData(model.workspaceAsyncData))
              .issues,
          ).toEqual(initialWorkspace.issues)

          expect(activeIssueBoard(model).announcement).toBe(
            'Moved to Done, position 1.',
          )
        }),
        Command.expectExact(
          MoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: issue.version,
          }),
        ),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
        ),
        model(model => {
          expect(visibleIssueOf(model, issue.id).status).toBe('Done')
          expect(visibleIssueOf(model, issue.id).comments).toContainEqual(
            teammateComment,
          )
          const confirmedWorkspace = Option.getOrThrow(
            AsyncData.getData(model.workspaceAsyncData),
          )
          expect(
            Array.map(confirmedWorkspace.issues, issue => issue.id),
          ).toEqual(initialVisibleIssueIds)
          expect(
            Array.findFirst(
              confirmedWorkspace.issues,
              current => current.id === issue.id,
            ),
          ).toEqual(Option.some(commentedIssue))
        }),
        Command.expectExact(
          MoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: issue.version,
          }),
        ),
        Command.resolve(
          MoveIssue,
          IssueMove.Message.FailedMoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            error: RepositoryError.Unavailable({
              operation: 'Move',
              message: 'Offline',
            }),
          }),
        ),
        model(model => {
          expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
          expect(visibleIssueOf(model, issue.id).comments).toContainEqual(
            teammateComment,
          )

          expect(activeIssueBoard(model).announcement).toBe(
            'Could not save the move. Issue position restored.',
          )
        }),
      )
    },
  )

  it.effect(
    'restores the original same-column placement and preserves a concurrent comment',
    () => {
      const issue = initialIssue('issue-103')
      const commentedIssue = modifyFields(issue, {
        comments: Array.append({
          id: 'comment-review',
          authorId: 'maya',
          body: 'Keep this comment when the move fails.',
          createdAt: '2026-10-22T12:00:00.000Z',
        }),
      })

      return story(
        application,
        startAt(boardPath),
        loadWorkspace,
        model(model => {
          expect(visibleIssueIds(model)).toEqual(initialVisibleIssueIds)
        }),
        withPendingIssueMove(issue.id, issue.status, 1),
        model(model => {
          expect(visibleIssueIds(model)).not.toEqual(initialVisibleIssueIds)
        }),
        withWorkspaceIssue(commentedIssue),
        message(
          issueMoveMessage(
            IssueMove.Message.FailedMoveIssue({
              issueId: issue.id,
              status: issue.status,
              insertionIndex: 1,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'The move could not be saved.',
              }),
            }),
          ),
        ),
        model(model => {
          expect(visibleIssueIds(model)).toEqual(initialVisibleIssueIds)
          expect(visibleIssueOf(model, issue.id)).toEqual(commentedIssue)
          expect(IssueMoveState.guards.FailedMove(model.issueMove.state)).toBe(
            true,
          )
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'preserves concurrent issue edits and unrelated rows when restoring the original global position',
    () => {
      const issue = initialIssue('issue-103')
      const unrelatedIssue = initialIssue('issue-101')
      const editedIssue = modifyFields(issue, {
        title: () => 'A teammate updated this issue',
        status: () => 'Todo',
        projectId: () => 'experience',
        version: Number.increment,
      })
      const commentedUnrelatedIssue = modifyFields(unrelatedIssue, {
        comments: Array.append({
          id: 'comment-other-issue',
          authorId: 'alex',
          body: 'An unrelated update must survive.',
          createdAt: '2026-10-22T12:01:00.000Z',
        }),
      })

      return story(
        application,
        startAt(boardPath),
        loadWorkspace,
        model(model => {
          expect(visibleIssueIds(model)).toEqual(initialVisibleIssueIds)
        }),
        withPendingIssueMove(issue.id, 'Done', 0),
        model(model => {
          expect(visibleIssueOf(model, issue.id).status).toBe('Done')
        }),
        withWorkspaceIssue(editedIssue),
        withWorkspaceIssue(commentedUnrelatedIssue),
        message(
          issueMoveMessage(
            IssueMove.Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'The move could not be saved.',
              }),
            }),
          ),
        ),
        model(model => {
          expect(visibleIssueIds(model)).toEqual(initialVisibleIssueIds)
          expect(visibleIssueOf(model, issue.id)).toEqual(editedIssue)
          expect(visibleIssueOf(model, unrelatedIssue.id)).toEqual(
            commentedUnrelatedIssue,
          )
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'restores placement before applying the canonical issue from a conflict result',
    () => {
      const issue = initialIssue('issue-103')
      const latestIssue = modifyFields(issue, {
        title: () => 'A newer canonical title',
        status: () => 'InProgress',
        version: Number.increment,
      })

      return story(
        application,
        startAt(boardPath),
        loadWorkspace,
        model(model => {
          expect(visibleIssueIds(model)).toEqual(initialVisibleIssueIds)
        }),
        withPendingIssueMove(issue.id, 'Done', 0),
        message(
          issueMoveMessage(
            IssueMove.Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Conflict({
                issueId: issue.id,
                expectedVersion: issue.version,
                actualVersion: latestIssue.version,
                latestIssue,
                message: 'The issue changed before it could be moved.',
              }),
            }),
          ),
        ),
        model(model => {
          expect(visibleIssueIds(model)).toEqual(initialVisibleIssueIds)
          expect(visibleIssueOf(model, issue.id)).toEqual(latestIssue)
          expect(model.issueMove.state).toEqual(
            IssueMoveState.FailedMove({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: 'The issue changed before it could be moved.',
            }),
          )
        }),
        Command.expectNone(),
      )
    },
  )
})
