import { Array, Option } from 'effect'
import { Command, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { NavigateInternal } from '../application'
import { Message } from '../application'
import {
  activeMemberMessage,
  application,
  issueListMessage,
  loadWorkspace,
  notificationMessage,
  startAt,
  teammateActivityMessage,
  url,
  visibleNotifications,
  visibleWorkspaceOf,
} from '../application.fixture'
import { Comment, IssueDraft } from '../domain/domain'
import { mergeIssue, savedIssueFromIssue } from '../domain/issue'
import { initialWorkspace } from '../domain/seed'
import { IssueList } from '../issueList'
import { NotificationCenter } from '../notificationCenter'
import {
  defaultIssueFilters,
  issueHref,
  issueRouter,
  urlToApplicationRoute,
} from '../route'
import {
  AppendActivity,
  AssignIssue,
  TeammateActivity,
} from '../teammateActivity'

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issueB = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))

const unrelatedIssue = Option.getOrThrow(
  Array.findFirst(initialWorkspace.issues, issue => issue.id === 'issue-104'),
)

describe('workspace notifications', () => {
  it.effect(
    'deduplicates comment notifications and preserves read state across late arrivals',
    () => {
      const body =
        'I checked the latest changes. This is ready for another look.'
      const comment = Comment.make({
        id: 'activity-comment',
        authorId: 'alex',
        body,
        createdAt: '2026-10-24T12:00:00.000Z',
      })
      const commentedIssue = modifyFields(issueA, {
        comments: Array.append(comment),
      })

      const staleComment = Comment.make({
        id: 'stale-comment',
        authorId: 'jordan',
        body: 'This older event arrived late.',
        createdAt: '2026-10-23T12:00:00.000Z',
      })
      const staleIssue = modifyFields(issueA, {
        comments: Array.append(staleComment),
      })
      const notificationId = `comment:${comment.id}:maya`

      return story(
        application,
        startAt(),
        loadWorkspace,
        message(Message.ClickedSimulateActivity()),
        Command.expectExact(
          AppendActivity({ issueId: issueA.id, authorId: 'alex', body }),
        ),
        Command.resolve(
          AppendActivity,
          TeammateActivity.Message.SucceededAppendActivity({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        model(model => {
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({
              id: notificationId,
              issueId: issueA.id,
              recipientId: 'maya',
              isRead: false,
            }),
          ])
        }),
        message(
          notificationMessage(
            NotificationCenter.Message.ClickedNotificationReadState({
              notificationId,
            }),
          ),
        ),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
        ),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: staleIssue.id,
              comment: Option.getOrThrow(Array.last(staleIssue.comments)),
            }),
          ),
        ),
        model(model => {
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({
              id: `comment:${staleComment.id}:maya`,
              isRead: false,
            }),
            expect.objectContaining({ id: notificationId, isRead: true }),
          ])

          const visibleIssue = Option.getOrThrow(
            Array.findFirst(
              visibleWorkspaceOf(model).issues,
              issue => issue.id === issueA.id,
            ),
          )

          expect(visibleIssue).toEqual(mergeIssue(commentedIssue, staleIssue))
          expect(visibleIssue.comments).toContainEqual(staleComment)
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'keeps background activity relevant and clears a failed event after assignment succeeds',
    () => {
      const assignedIssue = modifyFields(issueB, {
        version: version => version + 1,
        maybeAssigneeId: () => Option.some('maya'),
      })

      return story(
        application,
        startAt(issueRouter({ issueId: issueB.id })),
        loadWorkspace,
        message(Message.TickedActivityStream()),
        Command.expectExact(
          AppendActivity({
            issueId: issueA.id,
            authorId: 'alex',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Command.resolve(
          AppendActivity,
          TeammateActivity.Message.FailedAppendActivity({
            error: 'Activity is unavailable.',
          }),
        ),
        message(Message.TickedActivityStream()),
        Command.resolve(
          AppendActivity,
          TeammateActivity.Message.FailedAppendActivity({
            error: 'Activity is still unavailable.',
          }),
        ),
        message(Message.TickedActivityStream()),
        Command.expectExact(
          AssignIssue({
            issueId: issueB.id,
            draft: modifyFields(IssueDraft.make(issueB), {
              maybeAssigneeId: () => Option.some('maya'),
            }),
            expectedVersion: issueB.version,
            actorId: 'alex',
          }),
        ),
        Command.resolve(
          AssignIssue,
          TeammateActivity.Message.SucceededAssignIssue({
            savedIssue: savedIssueFromIssue(assignedIssue),
            actorId: 'alex',
            createdAt: '2026-10-24T12:00:00.000Z',
          }),
        ),
        model(model => {
          expect(model.maybeNotice).toEqual(Option.none())
          expect(visibleNotifications(model)).toContainEqual(
            expect.objectContaining({
              issueId: issueB.id,
              recipientId: 'maya',
              kind: { _tag: 'Assigned' },
            }),
          )
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'keeps own and unrelated comments outside the active member view',
    () => {
      const ownComment = Comment.make({
        id: 'own-comment',
        authorId: 'maya',
        body: 'I added more context for the team.',
        createdAt: '2026-10-24T13:00:00.000Z',
      })
      const unrelatedComment = Comment.make({
        id: 'unrelated-comment',
        authorId: 'alex',
        body: 'The empty state is ready for review.',
        createdAt: '2026-10-24T14:00:00.000Z',
      })
      const ownCommentIssue = modifyFields(issueA, {
        comments: Array.append(ownComment),
      })
      const unrelatedCommentIssue = modifyFields(unrelatedIssue, {
        comments: Array.append(unrelatedComment),
      })

      return story(
        application,
        startAt(),
        loadWorkspace,
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: ownCommentIssue.id,
              comment: Option.getOrThrow(Array.last(ownCommentIssue.comments)),
            }),
          ),
        ),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: unrelatedCommentIssue.id,
              comment: Option.getOrThrow(
                Array.last(unrelatedCommentIssue.comments),
              ),
            }),
          ),
        ),
        model(model => {
          expect(visibleNotifications(model)).toEqual([])
          expect(model.notificationCenter.notifications).toContainEqual(
            expect.objectContaining({
              id: `comment:${ownComment.id}:alex`,
              recipientId: 'alex',
            }),
          )
          expect(model.notificationCenter.notifications).toContainEqual(
            expect.objectContaining({
              id: `comment:${unrelatedComment.id}:jordan`,
              recipientId: 'jordan',
            }),
          )
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'isolates read state by member and routes a selected notification',
    () => {
      const comment = Comment.make({
        id: 'shared-comment',
        authorId: 'jordan',
        body: 'The command menu is ready for another pass.',
        createdAt: '2026-10-24T15:00:00.000Z',
      })
      const commentedIssue = modifyFields(issueA, {
        comments: Array.append(comment),
      })
      const assignedIssue = modifyFields(issueB, {
        version: version => version + 1,
        maybeAssigneeId: () => Option.some('maya'),
      })
      const alexNotificationId = `comment:${comment.id}:alex`
      const initialLinkModel = {
        route: urlToApplicationRoute(url('/')),
        savedViews: [],
      }

      return story(
        application,
        startAt(),
        loadWorkspace,
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
        ),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAssignIssue({
              savedIssue: savedIssueFromIssue(assignedIssue),
              actorId: 'jordan',
              createdAt: '2026-10-24T15:05:00.000Z',
            }),
          ),
        ),
        message(
          notificationMessage(
            NotificationCenter.Message.ClickedMarkAllAsRead({
              recipientId: 'maya',
            }),
          ),
        ),
        model(model => {
          expect(
            Array.every(
              visibleNotifications(model),
              notification => notification.isRead,
            ),
          ).toBe(true)
          expect(model.notificationCenter.notifications).toContainEqual(
            expect.objectContaining({
              id: `assignment:${issueB.id}:${assignedIssue.version}:maya`,
              recipientId: 'maya',
              isRead: true,
            }),
          )
          expect(
            Array.some(
              model.notificationCenter.notifications,
              notification =>
                notification.id.startsWith('assignment:') &&
                notification.recipientId !== 'maya',
            ),
          ).toBe(false)
        }),
        message(activeMemberMessage('alex')),
        model(model => {
          expect(model.memberSwitcher.activeMemberId).toBe('alex')
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({ id: alexNotificationId, isRead: false }),
          ])
        }),
        message(
          notificationMessage(
            NotificationCenter.Message.ClickedNotification({
              notificationId: alexNotificationId,
            }),
          ),
        ),
        Command.expectExact(
          NavigateInternal({ url: issueHref(initialLinkModel, issueA.id) }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        model(model => {
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({ id: alexNotificationId, isRead: true }),
          ])
        }),
      )
    },
  )

  it.effect(
    'preserves a foreground notice when background activity succeeds',
    () =>
      story(
        application,
        startAt(),
        loadWorkspace,
        message(
          issueListMessage(
            IssueList.Message.UpdatedSavedViewName({ value: 'My work' }),
          ),
        ),
        message(
          issueListMessage(
            IssueList.Message.SubmittedSavedView({
              filters: defaultIssueFilters,
            }),
          ),
        ),
        model(model => {
          expect(model.maybeNotice).toEqual(Option.some('Saved view “My work”'))
        }),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: issueA.id,
              comment: Comment.make({
                id: 'notice-comment',
                authorId: 'alex',
                body: 'Activity',
                createdAt: '2026-10-24T12:00:00.000Z',
              }),
            }),
          ),
        ),
        model(model => {
          expect(model.maybeNotice).toEqual(Option.some('Saved view “My work”'))
        }),
        Command.expectNone(),
      ),
  )
})
