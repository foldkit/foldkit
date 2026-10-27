import { clsx } from 'clsx'
import { Array, Option, Schema } from 'effect'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Issue, Member, Notification, NotificationKind } from '../domain'
import {
  NotificationCenterComposition,
  type NotificationCenterViewBuilder,
  PopoverBinding,
} from './composition'
import { Message } from './message'
import type { Model } from './model'
import { absoluteTime, relativeTime } from './time'

const ViewInputs = Schema.Struct({
  members: Schema.Array(Member),
  issues: Schema.Array(Issue),
  activeMemberId: Schema.String,
})

const TITLE_ID = 'workspace-notifications-title'
const UNREAD_DESCRIPTION_ID = 'workspace-notifications-unread-description'

const bellIcon = (h: NotificationCenterViewBuilder): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class('size-5'),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.7'),
    ],
    [
      h.path([
        h.D('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4'),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ]),
    ],
  )

const readStateIcon = (
  isRead: boolean,
  h: NotificationCenterViewBuilder,
): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class('size-4'),
      h.ViewBox('0 0 16 16'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
    ],
    isRead
      ? [h.circle([h.Cx('8'), h.Cy('8'), h.R('3')])]
      : [
          h.path([
            h.D('m3.5 8 3 3 6-6'),
            h.StrokeLinecap('round'),
            h.StrokeLinejoin('round'),
          ]),
        ],
  )

const notificationView = (
  notification: typeof Notification.Type,
  model: typeof Model.Type,
  viewInputs: typeof ViewInputs.Type,
  h: NotificationCenterViewBuilder,
): Html => {
  const maybeActor = Array.findFirst(
    viewInputs.members,
    member => member.id === notification.actorId,
  )

  const maybeIssue = Array.findFirst(
    viewInputs.issues,
    issue => issue.id === notification.issueId,
  )

  const actorName = Option.match(maybeActor, {
    onNone: () => 'Someone',
    onSome: member => member.name,
  })
  const actorInitials = Option.match(maybeActor, {
    onNone: () => '?',
    onSome: member => member.initials,
  })

  const issueIdentifier = Option.match(maybeIssue, {
    onNone: () => notification.issueId,
    onSome: issue => issue.identifier,
  })
  const issueTitle = Option.match(maybeIssue, {
    onNone: () => 'Issue',
    onSome: issue => issue.title,
  })

  const copy = NotificationKind.match(notification.kind, {
    Commented: ({ body }) => ({
      event: 'commented on',
      maybeBody: Option.some(body),
    }),
    Assigned: () => ({ event: 'assigned you to', maybeBody: Option.none() }),
  })

  const readStateAction = `${notification.isRead ? 'Mark as unread' : 'Mark as read'}: ${issueIdentifier}`

  return h.keyed('li')(
    notification.id,
    [
      h.Class(
        clsx(
          'relative flex items-start gap-2 border-b border-slate-100 p-2 transition-colors last:border-b-0',
          {
            'bg-white hover:bg-slate-100 focus-within:bg-slate-100':
              notification.isRead,
            'bg-indigo-50/60 hover:bg-indigo-100 focus-within:bg-indigo-100':
              !notification.isRead,
          },
        ),
      ),
    ],
    [
      Button.view(
        {
          type: 'button',
          onClick: Message.ClickedNotification({
            notificationId: notification.id,
          }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md p-2 text-left text-sm font-medium text-slate-700 outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500',
                ),
              ],
              [
                h.span(
                  [
                    h.AriaHidden(true),
                    h.Class(
                      'inline-grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700',
                    ),
                  ],
                  [actorInitials],
                ),
                h.span(
                  [h.Class('min-w-0 flex-1')],
                  [
                    h.span(
                      [h.Class('block leading-5')],
                      [
                        h.span([h.Class('font-semibold')], [actorName]),
                        ` ${copy.event} `,
                        h.span([h.Class('font-semibold')], [issueIdentifier]),
                      ],
                    ),
                    h.span(
                      [
                        h.Class(
                          'block truncate text-sm font-normal text-slate-600',
                        ),
                      ],
                      [issueTitle],
                    ),
                    ...Option.match(copy.maybeBody, {
                      onNone: () => [],
                      onSome: body => [
                        h.span(
                          [
                            h.Class(
                              'mt-1 line-clamp-2 block text-sm font-normal leading-5 text-slate-600',
                            ),
                          ],
                          [body],
                        ),
                      ],
                    }),
                    h.time(
                      [
                        h.Datetime(notification.createdAt),
                        h.Title(absoluteTime(notification.createdAt)),
                        h.Class(
                          'mt-1 block text-xs font-medium text-slate-500',
                        ),
                      ],
                      [relativeTime(notification.createdAt, model.now)],
                    ),
                  ],
                ),
              ],
            ),
        },
        h,
      ),
      Button.view(
        {
          type: 'button',
          onClick: Message.ClickedNotificationReadState({
            notificationId: notification.id,
          }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel(readStateAction),
                h.Title(readStateAction),
                h.Class(
                  'mt-1 inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                ),
              ],
              [readStateIcon(notification.isRead, h)],
            ),
        },
        h,
      ),
    ],
  )
}

export const view = NotificationCenterComposition.makeView.withInputs<
  typeof ViewInputs.Type
>((model, viewInputs, h) => {
  const visibleNotifications = Array.filter(
    model.notifications,
    notification => notification.recipientId === viewInputs.activeMemberId,
  )

  const unreadCount = Array.filter(
    visibleNotifications,
    notification => !notification.isRead,
  ).length

  const unreadDescription =
    unreadCount === 1
      ? '1 unread notification'
      : `${unreadCount} unread notifications`

  return h.block(
    PopoverBinding.embedView({
      slotId: model.popover.id,
      model: model.popover,
      viewInputs: {
        ariaLabel: 'Notifications',
        anchor: { placement: 'bottom-end', gap: 8, padding: 8 },
        toView: ({ button, panel, backdrop, isVisible }) =>
          h.div(
            [h.Class(clsx('relative inline-flex', { 'z-20': isVisible }))],
            [
              h.button(
                [
                  ...button,
                  h.AriaDescribedBy(UNREAD_DESCRIPTION_ID),
                  h.Class(
                    'relative inline-grid size-9 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                  ),
                ],
                [
                  bellIcon(h),
                  ...(unreadCount > 0
                    ? [
                        h.span(
                          [
                            h.AriaHidden(true),
                            h.Class(
                              'absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold leading-5 text-white',
                            ),
                          ],
                          [
                            unreadCount > 99
                              ? '99+'
                              : globalThis.String(unreadCount),
                          ],
                        ),
                      ]
                    : []),
                ],
              ),
              h.span(
                [h.Id(UNREAD_DESCRIPTION_ID), h.Class('sr-only')],
                [unreadDescription],
              ),
              ...(isVisible
                ? [
                    h.div([...backdrop, h.Class('fixed inset-0 z-0')]),
                    h.div(
                      [
                        ...panel,
                        h.Role('dialog'),
                        h.AriaLabelledBy(TITLE_ID),
                        h.Class(
                          'popover-surface z-10 w-[min(22rem,calc(100vw-1rem))] overflow-hidden text-sm font-medium',
                        ),
                      ],
                      [
                        h.header(
                          [
                            h.Class(
                              'flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3',
                            ),
                          ],
                          [
                            h.h2(
                              [
                                h.Id(TITLE_ID),
                                h.Class(
                                  'text-base font-semibold text-slate-700',
                                ),
                              ],
                              ['Notifications'],
                            ),
                            ...(unreadCount > 0
                              ? [
                                  Button.view(
                                    {
                                      type: 'button',
                                      onClick: Message.ClickedMarkAllAsRead({
                                        recipientId: viewInputs.activeMemberId,
                                      }),
                                      toView: attributes =>
                                        h.button(
                                          [
                                            ...attributes.button,
                                            h.Class('button-compact'),
                                          ],
                                          ['Mark all as read'],
                                        ),
                                    },
                                    h,
                                  ),
                                ]
                              : []),
                          ],
                        ),
                        ...Array.match(visibleNotifications, {
                          onEmpty: () => [
                            h.p(
                              [
                                h.Class(
                                  'px-5 py-10 text-center text-sm font-normal text-slate-500',
                                ),
                              ],
                              ["You're all caught up."],
                            ),
                          ],
                          onNonEmpty: notifications => [
                            h.ul(
                              [
                                h.AriaLabel('Notification list'),
                                h.Class(
                                  'max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain',
                                ),
                              ],
                              Array.map(notifications, notification =>
                                notificationView(
                                  notification,
                                  model,
                                  viewInputs,
                                  h,
                                ),
                              ),
                            ),
                          ],
                        }),
                      ],
                    ),
                  ]
                : []),
            ],
          ),
      },
    }),
  )
})
