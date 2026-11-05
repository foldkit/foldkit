import { Array, Option } from 'effect'
import {
  expectNoOutMessage,
  expectOutMessage,
  inMessage,
  init,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Comment, Issue, NotificationActivity } from '../../domain'
import { NotificationCenterBlock } from './block'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { Message } from './message'
import { OutMessage } from './outMessage'

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
  it.effect(
    'deduplicates activity and retains each recipient read state',
    () => {
      return story(
        { block: NotificationCenterBlock, layer },
        init(),
        inMessage(InMessage.InformedOfActivity({ activity })),
        message(
          Message.ClickedNotificationReadState({
            notificationId: 'comment:comment-new:member-assignee',
          }),
        ),
        inMessage(InMessage.InformedOfActivity({ activity })),
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
    },
  )

  it.effect(
    'marks the selected notification read without changing another recipient',
    () => {
      return story(
        { block: NotificationCenterBlock, layer },
        init(),
        inMessage(InMessage.InformedOfActivity({ activity })),
        message(
          Message.ClickedNotification({
            notificationId: 'comment:comment-new:member-assignee',
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
