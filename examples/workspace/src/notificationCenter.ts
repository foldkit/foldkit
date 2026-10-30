import { clsx } from 'clsx'
import {
  Array,
  Clock,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
} from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Popover } from '@foldkit/ui'

import {
  Issue,
  Member,
  Notification,
  NotificationActivity,
  NotificationKind,
  makeNotifications,
} from './domain/domain'

const CLOCK_INTERVAL = Duration.minutes(1)

const MONTH = Duration.days(30)
const YEAR = Duration.days(365)

const TITLE_ID = 'workspace-notifications-title'
const UNREAD_DESCRIPTION_ID = 'workspace-notifications-unread-description'

export const Message = defineMessageUnion({
  InformedOfActivity: { activity: NotificationActivity },
  TickedClock: { timestamp: Schema.Number },
  ClickedMarkAllAsRead: { recipientId: Schema.String },
  ClickedNotificationReadState: { notificationId: Schema.String },
  ClickedNotification: { notificationId: Schema.String },
})
export type Message = typeof Message.Type
type InformedOfActivity = typeof Message.InformedOfActivity.Type
type ClickedMarkAllAsRead = typeof Message.ClickedMarkAllAsRead.Type
type ClickedNotificationReadState =
  typeof Message.ClickedNotificationReadState.Type

export const OutMessage = defineMessageUnion({
  SelectedIssue: { issueId: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

const Model = Schema.Struct({
  notifications: Schema.Array(Notification),
  now: Schema.Number,
  popover: Popover.Popover,
})
type Model = typeof Model.Type

const ViewInput = Schema.Struct({
  members: Schema.Array(Member),
  issues: Schema.Array(Issue),
  activeMemberId: Schema.String,
})
type ViewInput = typeof ViewInput.Type

export class NotificationCenter extends Block<
  NotificationCenter,
  void,
  ViewInput
>()('NotificationCenter', { Model, Message, OutMessage }) {}

const handleInformedOfActivity = (
  model: Model,
  { activity }: InformedOfActivity,
) => ({
  model: modifyFields(model, {
    notifications: notifications => {
      const incomingNotifications = makeNotifications(activity)

      const unseenNotifications = Array.filter(
        incomingNotifications,
        notification =>
          !Array.some(
            notifications,
            existingNotification => existingNotification.id === notification.id,
          ),
      )

      return [...unseenNotifications, ...notifications]
    },
  }),
})

const handleClickedMarkAllAsRead = (
  model: Model,
  { recipientId }: ClickedMarkAllAsRead,
) => ({
  model: modifyFields(model, {
    notifications: Array.map(notification =>
      notification.recipientId === recipientId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  }),
})

const handleClickedNotificationReadState = (
  model: Model,
  { notificationId }: ClickedNotificationReadState,
) => ({
  model: modifyFields(model, {
    notifications: Array.map(notification =>
      notification.id === notificationId
        ? modifyFields(notification, {
            isRead: isRead => !isRead,
          })
        : notification,
    ),
  }),
})

const markAsRead = (model: Model, notificationId: string): Model =>
  modifyFields(model, {
    notifications: Array.map(notification =>
      notification.id === notificationId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  })

const relativeTime = (createdAt: string, now: number): string =>
  Option.match(DateTime.make(createdAt), {
    onNone: () => 'Recently',
    onSome: createdAt => {
      const elapsed = Duration.millis(
        Math.max(0, now - DateTime.toEpochMillis(createdAt)),
      )

      if (Duration.isLessThan(elapsed, Duration.minutes(1))) {
        return 'Just now'
      } else if (Duration.isLessThan(elapsed, Duration.hours(1))) {
        return `${Math.floor(Duration.toMinutes(elapsed))}m ago`
      } else if (Duration.isLessThan(elapsed, Duration.days(1))) {
        return `${Math.floor(Duration.toHours(elapsed))}h ago`
      } else if (Duration.isLessThan(elapsed, Duration.weeks(1))) {
        return `${Math.floor(Duration.toDays(elapsed))}d ago`
      } else if (Duration.isLessThan(elapsed, MONTH)) {
        return `${Math.floor(Duration.toWeeks(elapsed))}w ago`
      } else if (Duration.isLessThan(elapsed, YEAR)) {
        return `${Math.floor(Duration.toMillis(elapsed) / Duration.toMillis(MONTH))}mo ago`
      } else {
        return `${Math.floor(Duration.toMillis(elapsed) / Duration.toMillis(YEAR))}y ago`
      }
    },
  })

const absoluteTime = (createdAt: string): string =>
  Option.match(DateTime.make(createdAt), {
    onNone: () => createdAt,
    onSome: date =>
      DateTime.formatLocal(date, {
        locale: 'en',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
  })

const bellIcon = (h: HtmlBuilder<Message, unknown>): Html =>
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
  h: HtmlBuilder<Message, unknown>,
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
  notification: Notification,
  model: Model,
  viewInput: ViewInput,
  h: HtmlBuilder<Message, unknown>,
): Html => {
  const maybeActor = Array.findFirst(
    viewInput.members,
    member => member.id === notification.actorId,
  )

  const maybeIssue = Array.findFirst(
    viewInput.issues,
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

export const NotificationCenterLive = NotificationCenter.make(
  Effect.fn(function* () {
    const clock = yield* Clock.Clock
    const popover = yield* new Popover.Popover('popover', {
      id: 'workspace-notifications',
    })

    return {
      model: { notifications: [], now: 0, popover },
      update: {
        InformedOfActivity: handleInformedOfActivity,
        TickedClock: (model, { timestamp }) => ({
          model: modifyFields(model, { now: () => timestamp }),
        }),
        ClickedMarkAllAsRead: handleClickedMarkAllAsRead,
        ClickedNotificationReadState: handleClickedNotificationReadState,
        ClickedNotification: (model, { notificationId }) =>
          Option.match(
            Array.findFirst(
              model.notifications,
              notification => notification.id === notificationId,
            ),
            {
              onNone: () => ({ model }),
              onSome: notification => ({
                model: markAsRead(model, notificationId),
                messages: [
                  model.popover.send(Popover.Popover.Message.RequestedClose()),
                ],
                outMessage: OutMessage.SelectedIssue({
                  issueId: notification.issueId,
                }),
              }),
            },
          ),
      },
      subscriptions: {
        clock: {
          dependencies: model => model.popover.model.isOpen,
          stream: (isOpen: boolean) =>
            isOpen
              ? Stream.tick(CLOCK_INTERVAL).pipe(
                  Stream.mapEffect(() => clock.currentTimeMillis),
                  Stream.map(timestamp => Message.TickedClock({ timestamp })),
                )
              : Stream.empty,
        },
      },
      view: (model, h, viewInput) => {
        const visibleNotifications = Array.filter(
          model.notifications,
          notification => notification.recipientId === viewInput.activeMemberId,
        )

        const unreadCount = Array.filter(
          visibleNotifications,
          notification => !notification.isRead,
        ).length

        const unreadDescription =
          unreadCount === 1
            ? '1 unread notification'
            : `${unreadCount} unread notifications`

        return model.popover.view({
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
                                          recipientId: viewInput.activeMemberId,
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
                                    viewInput,
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
        })
      },
    }
  }),
).pipe(Layer.provide(Popover.PopoverLive))
