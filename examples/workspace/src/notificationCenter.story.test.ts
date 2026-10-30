import { Array, Option } from 'effect'
import { Block } from 'foldkit'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  story,
} from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { Popover } from '@foldkit/ui'

import { Comment, Issue, NotificationActivity } from './domain/domain'
import {
  Message,
  NotificationCenterLive,
  OutMessage,
} from './notificationCenter'

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

describe('NotificationCenter', () => {
  it.effect('deduplicates activity and retains each recipient read state', () =>
    story(
      NotificationCenterLive,
      message(Message.InformedOfActivity({ activity })),
      message(
        Message.ClickedNotificationReadState({
          notificationId: 'comment:comment-new:member-assignee',
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
    ),
  )

  it.effect(
    'marks the selected notification read without changing another recipient',
    () =>
      story(
        NotificationCenterLive,
        message(Message.InformedOfActivity({ activity })),
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
      ),
  )

  it.effect('closes the popover when a notification is selected', () =>
    story(
      NotificationCenterLive,
      message(Message.InformedOfActivity({ activity })),
      message(
        Block.deliver(
          Popover.Popover,
          'popover',
          Popover.Popover.Message.RequestedOpen(),
        ),
      ),
      model(model => {
        expect(model.popover.isOpen).toBe(true)
      }),
      message(
        Message.ClickedNotification({
          notificationId: 'comment:comment-new:member-assignee',
        }),
      ),
      model(model => {
        expect(model.popover.isOpen).toBe(false)
      }),
      expectOutMessage(OutMessage.SelectedIssue({ issueId: issue.id })),
      Command.resolve(
        Popover.test.FocusPopoverButton,
        Popover.Popover.Message.CompletedFocusPopoverButton(),
      ),
    ),
  )
})
