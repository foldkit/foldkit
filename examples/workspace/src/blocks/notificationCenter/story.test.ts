import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Issue } from '../../domain'
import { NotificationCenterBlock } from './block'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { Message } from './message'
import { OutMessage } from './outMessage'

const previousComment = Issue.Comment.make({
  id: 'comment-previous',
  authorId: 'member-participant',
  body: 'Earlier context',
  createdAt: '2026-10-24T12:00:00.000Z',
})
const newComment = Issue.Comment.make({
  id: 'comment-new',
  authorId: 'member-author',
  body: 'Can you review this?',
  createdAt: '2026-10-24T13:00:00.000Z',
})
const issue = Issue.Issue.make({
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

describe('NotificationCenterBlock', () => {
  it.effect(
    'deduplicates comments and retains each recipient read state',
    () => {
      return Story.story(
        { block: NotificationCenterBlock, layer },
        Story.init(),
        Story.inMessage(
          InMessage.InformedOfIssueComment({ issue, comment: newComment }),
        ),
        Story.message(
          Message.ClickedNotificationReadToggle({
            notificationId: 'comment:comment-new:member-assignee',
          }),
        ),
        Story.inMessage(
          InMessage.InformedOfIssueComment({ issue, comment: newComment }),
        ),
        Story.model(model => {
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
        Story.expectNoOutMessage(),
      )
    },
  )

  it.effect(
    'marks the selected notification read without changing another recipient',
    () => {
      return Story.story(
        { block: NotificationCenterBlock, layer },
        Story.init(),
        Story.inMessage(
          InMessage.InformedOfIssueComment({ issue, comment: newComment }),
        ),
        Story.message(
          Message.ClickedNotification({
            notificationId: 'comment:comment-new:member-assignee',
          }),
        ),
        Story.expectOutMessage(OutMessage.SelectedIssue({ issueId: issue.id })),
        Story.model(model => {
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
      )
    },
  )
})
