import { Array, Option } from 'effect'
import {
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Comment, Issue, NotificationActivity } from '../domain'
import { NotificationCenterBlock } from './block'
import { Message, OutMessage } from './definition'
import { update } from './update'

const previousComment = Comment.make({
  id: 'comment-previous',
  authorId: 'member-participant',
  body: 'Earlier context',
  createdAt: '2026-10-24T12:00:00.000Z',
})
const newComment = Comment.make({
  id: 'comment-new',
  authorId: 'member-author',
  body: 'Can you review this?',
  createdAt: '2026-10-24T13:00:00.000Z',
})
const issue = Issue.make({
  id: 'issue-notifications',
  identifier: 'WSP-200',
  title: 'Review notification behavior',
  description: '',
  status: 'Todo',
  priority: 'Medium',
  projectId: 'workspace',
  maybeAssigneeId: Option.some('member-assignee'),
  labelIds: [],
  version: 1,
  comments: [previousComment, newComment],
})
const activity = NotificationActivity.Commented({ issue, comment: newComment })

describe('NotificationCenterBlock', () => {
  test('deduplicates activity and retains each recipient read state', () => {
    story(
      update,
      given(NotificationCenterBlock.init().model),
      message(Message.InformedOfActivity({ activity })),
      message(
        Message.ClickedNotificationReadState({
          notificationId: 'comment:comment-new:member-assignee',
          recipientId: 'member-assignee',
        }),
      ),
      message(Message.InformedOfActivity({ activity })),
      model(model => {
        expect(model.notifications).toHaveLength(2)
        expect(
          Array.findFirst(
            model.notifications,
            notification => notification.recipientId === 'member-assignee',
          ).pipe(Option.getOrThrow).isRead,
        ).toBe(true)
        expect(
          Array.findFirst(
            model.notifications,
            notification => notification.recipientId === 'member-participant',
          ).pipe(Option.getOrThrow).isRead,
        ).toBe(false)
      }),
      expectNoOutMessage(),
    )
  })

  test('verifies the recipient before selecting and marking a notification read', () => {
    story(
      update,
      given(NotificationCenterBlock.init().model),
      message(Message.InformedOfActivity({ activity })),
      message(
        Message.ClickedNotification({
          notificationId: 'comment:comment-new:member-assignee',
          recipientId: 'member-participant',
        }),
      ),
      expectNoOutMessage(),
      message(
        Message.ClickedNotification({
          notificationId: 'comment:comment-new:member-assignee',
          recipientId: 'member-assignee',
        }),
      ),
      expectOutMessage(OutMessage.SelectedIssue({ issueId: issue.id })),
      model(model => {
        expect(
          Array.findFirst(
            model.notifications,
            notification => notification.recipientId === 'member-assignee',
          ).pipe(Option.getOrThrow).isRead,
        ).toBe(true)
      }),
    )
  })
})
