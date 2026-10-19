import { Array, Match, Option, pipe } from 'effect'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'

import { VirtualList } from '@foldkit/ui'

import { Message } from '../message'
import type { VirtualListChatMessage } from '../model'

// SAMPLE DATA

type Activity = Readonly<{
  id: number
  actor: string
  initial: string
  colorClass: string
  verb: string
  target: string
  timeAgo: string
  hasSummary: boolean
}>

export const ROW_COUNT = 10_000

const actorNames = [
  'Sarah Chen',
  'Marcus Davies',
  'Priya Patel',
  'Alex Kim',
  'Jordan Lee',
  'Sam Rivera',
  'Ben Carter',
  'Mira Patel',
  'Lucy Hong',
  'Casey Park',
  'Robin Adams',
  'Tomás Reyes',
]

const actionVerbs = [
  'merged',
  'opened',
  'commented on',
  'approved',
  'closed',
  'reopened',
  'requested review on',
  'pushed to',
]

const colorClasses = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-teal-500',
  'bg-orange-500',
]

const branchNames = [
  'main',
  'feat/scroll-handlers',
  'fix/dialog-focus',
  'refactor/auth',
  'chore/deps',
]

const cycle = (xs: ReadonlyArray<string>, index: number): string =>
  pipe(xs, Array.get(index % xs.length), Option.getOrThrow)

const formatTimeAgo = (hours: number): string => {
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))}m ago`
  }
  if (hours < 24) {
    return `${Math.round(hours)}h ago`
  }
  const days = hours / 24
  if (days < 30) {
    return `${Math.round(days)}d ago`
  }
  const months = days / 30
  if (months < 12) {
    return `${Math.round(months)}mo ago`
  }
  return `${Math.round(months / 12)}y ago`
}

const targetForVerb = (verb: string, index: number): string => {
  const number = ((index * 13) % 9999) + 1
  return Match.value(verb).pipe(
    Match.withReturnType<string>(),
    Match.when('pushed to', () => cycle(branchNames, index)),
    Match.whenOr('opened', 'closed', 'reopened', () => `issue #${number}`),
    Match.orElse(() => `PR #${number}`),
  )
}

const sampleActivities: ReadonlyArray<Activity> = Array.makeBy(
  ROW_COUNT,
  index => {
    const actor = cycle(actorNames, index)
    const verb = cycle(actionVerbs, index)
    const colorClass = cycle(colorClasses, index)
    const hoursAgo = index * 2.3
    return {
      id: index,
      actor,
      initial: actor.charAt(0),
      colorClass,
      verb,
      target: targetForVerb(verb, index),
      timeAgo: formatTimeAgo(hoursAgo),
      hasSummary: index % 4 === 0,
    }
  },
)

// VIEW

const containerClassName =
  'h-96 w-full rounded-lg bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 overscroll-none'

const rowClassName =
  'grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800'

const avatarClassName = (colorClass: string): string =>
  `${colorClass} flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white`

const activityTextClassName =
  'truncate text-sm text-gray-700 dark:text-gray-300'

const actorClassName = 'font-semibold text-gray-900 dark:text-white'

const targetClassName = 'font-mono text-gray-900 dark:text-gray-100'

const timeAgoClassName =
  'text-right text-xs text-gray-600 dark:text-gray-400 tabular-nums'

const buttonClassName =
  'button-accent rounded cursor-pointer px-3 py-1.5 text-sm shadow-sm'

const secondaryButtonClassName =
  'inline-flex h-9 cursor-pointer items-center justify-center rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-normal text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:outline-accent-400'

const headerClassName =
  'flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-400'

export const view = (model: VirtualList.Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('flex flex-col gap-4 w-full')],
      [
        h.div(
          [h.Class(headerClassName)],
          [
            h.span([], [`${ROW_COUNT.toLocaleString()} activity events`]),
            h.button(
              [
                h.Class(buttonClassName),
                h.OnClick(Message.ClickedVirtualListScrollToMiddle()),
              ],
              ['Jump to middle'],
            ),
          ],
        ),
        h.submodel({
          slotId: model.id,
          model,
          view: VirtualList.view<Activity>(),
          viewInputs: {
            items: sampleActivities,
            itemToKey: row => String(row.id),
            itemToView: row =>
              h.div(
                [h.Class(rowClassName)],
                [
                  h.div(
                    [h.Class(avatarClassName(row.colorClass))],
                    [row.initial],
                  ),
                  h.div(
                    [h.Class(activityTextClassName)],
                    [
                      h.span([h.Class(actorClassName)], [row.actor]),
                      ' ',
                      row.verb,
                      ' ',
                      h.span([h.Class(targetClassName)], [row.target]),
                    ],
                  ),
                  h.div([h.Class(timeAgoClassName)], [row.timeAgo]),
                ],
              ),
            containerClassName,
            containerAttributes: childAttributes([
              h.AriaLabel('Activity events'),
              h.Tabindex(0),
            ]),
          },
          toParentMessage: message =>
            Message.GotVirtualListDemoMessage({ message }),
        }),
      ],
    ),
  ]
}

// VARIABLE-HEIGHT DEMO

const SHORT_ROW_HEIGHT_PX = 56
const TALL_ROW_HEIGHT_PX = 112

type Summary = Readonly<{
  title: string
  body: string
  artifact: string
}>

const summaries: ReadonlyArray<Summary> = [
  {
    title: 'CI passing across all browsers',
    body: 'Resolved the flake in the snapshot suite and confirmed the migration step runs idempotently against staging.',
    artifact: 'ci/run-4892',
  },
  {
    title: 'Tracking upstream change',
    body: 'Linked the upstream regression and added reproduction context so the next reviewer has everything in one place.',
    artifact: 'tracker/issue-218',
  },
  {
    title: 'Release notes ready for review',
    body: 'Bumped the patch version, regenerated the changelog, and queued the release notes for editorial pass.',
    artifact: 'release/v0.42.1-rc1',
  },
  {
    title: 'Rollback plan coordinated',
    body: 'Walked through the unwind steps with on-call and pre-staged the revert PR in case the deploy needs to be undone.',
    artifact: 'runbook/rollback-checklist',
  },
  {
    title: 'Failure trace attached',
    body: 'Captured the steps to reproduce, attached the failing trace, and tagged the owning team for triage.',
    artifact: 'traces/failure-7c2e',
  },
  {
    title: 'Visual direction approved',
    body: 'Aligned with the design team on spacing, contrast, and the dark-mode treatment before merging the implementation.',
    artifact: 'design/spec-v3',
  },
  {
    title: 'Migration verified on staging',
    body: 'Confirmed the migration runs cleanly against the staging snapshot and produces the expected row counts on every shard.',
    artifact: 'migration/2026-04-batch',
  },
]

const summaryFor = (index: number): Summary =>
  pipe(summaries, Array.get(index % summaries.length), Option.getOrThrow)

export const variableActivities: ReadonlyArray<Activity> = sampleActivities

export const variableRowHeightPx = (activity: Activity): number =>
  activity.hasSummary ? TALL_ROW_HEIGHT_PX : SHORT_ROW_HEIGHT_PX

const variableTallRowClassName =
  'grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800'

const variableSummaryTitleClassName =
  'mt-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200'

const variableSummaryBodyClassName =
  'mt-0.5 text-xs text-gray-600 dark:text-gray-400 leading-tight line-clamp-1'

const variableArtifactClassName =
  'mt-1 inline-flex w-fit rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-700 dark:text-gray-300'

export const virtualListVariableDemo = (
  model: VirtualList.Model,
  h: HtmlBuilder<Message>,
) => {
  const variableTallRow = (row: Activity, summary: Summary) =>
    h.div(
      [h.Class(variableTallRowClassName)],
      [
        h.div([h.Class(avatarClassName(row.colorClass))], [row.initial]),
        h.div(
          [h.Class('min-w-0')],
          [
            h.div(
              [h.Class(activityTextClassName)],
              [
                h.span([h.Class(actorClassName)], [row.actor]),
                ' ',
                row.verb,
                ' ',
                h.span([h.Class(targetClassName)], [row.target]),
              ],
            ),
            h.div([h.Class(variableSummaryTitleClassName)], [summary.title]),
            h.div([h.Class(variableSummaryBodyClassName)], [summary.body]),
            h.div([h.Class(variableArtifactClassName)], [summary.artifact]),
          ],
        ),
        h.div([h.Class(timeAgoClassName)], [row.timeAgo]),
      ],
    )

  const variableShortRow = (row: Activity) =>
    h.div(
      [h.Class(rowClassName)],
      [
        h.div([h.Class(avatarClassName(row.colorClass))], [row.initial]),
        h.div(
          [h.Class(activityTextClassName)],
          [
            h.span([h.Class(actorClassName)], [row.actor]),
            ' ',
            row.verb,
            ' ',
            h.span([h.Class(targetClassName)], [row.target]),
          ],
        ),
        h.div([h.Class(timeAgoClassName)], [row.timeAgo]),
      ],
    )

  return [
    h.div(
      [h.Class('flex flex-col gap-4 w-full')],
      [
        h.div(
          [h.Class(headerClassName)],
          [
            h.span(
              [],
              [
                'Mixed-height rows: every fourth row is taller and shows a summary',
              ],
            ),
            h.button(
              [
                h.Class(buttonClassName),
                h.OnClick(Message.ClickedVirtualListVariableScrollToMiddle()),
              ],
              ['Jump to middle'],
            ),
          ],
        ),
        h.submodel({
          slotId: model.id,
          model,
          view: VirtualList.view<Activity>(),
          viewInputs: {
            items: variableActivities,
            itemToKey: row => String(row.id),
            itemToRowHeightPx: variableRowHeightPx,
            itemToView: (row, index) =>
              row.hasSummary
                ? variableTallRow(row, summaryFor(index))
                : variableShortRow(row),
            containerClassName,
            containerAttributes: childAttributes([
              h.AriaLabel('Variable-height activity events'),
              h.Tabindex(0),
            ]),
          },
          toParentMessage: message =>
            Message.GotVirtualListVariableDemoMessage({ message }),
        }),
      ],
    ),
  ]
}

// CHAT DEMO

const chatMessageClassName =
  'grid max-w-[88%] sm:max-w-[78%] cursor-pointer gap-1 rounded-2xl px-4 py-2 text-left text-sm leading-5 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400'

const receivedChatMessageClassName =
  'rounded-bl-md bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-800/80'

const sentChatMessageClassName =
  'rounded-br-md bg-accent-100 text-gray-900 ring-1 ring-accent-200 hover:bg-accent-200/45 dark:bg-accent-900/40 dark:text-gray-100 dark:ring-accent-800 dark:hover:bg-accent-900/50'

const chatMessageDetailClassName =
  'text-xs leading-relaxed text-gray-600 dark:text-gray-400'

const COLLAPSED_CHAT_MESSAGE_ESTIMATED_HEIGHT_PX = 48
const EXPANDED_CHAT_MESSAGE_ESTIMATED_HEIGHT_PX = 80

const chatMessageView = (
  message: VirtualListChatMessage,
  h: HtmlBuilder<Message>,
) => {
  const isSentMessage = message.id % 2 !== 0

  return h.div(
    [
      h.Class(
        `flex w-full px-3 sm:px-4 py-1.5 ${isSentMessage ? 'justify-end' : 'justify-start'}`,
      ),
    ],
    [
      h.button(
        [
          h.Class(
            `${chatMessageClassName} ${isSentMessage ? sentChatMessageClassName : receivedChatMessageClassName}`,
          ),
          h.DataAttribute(
            'virtual-list-chat-message-id',
            globalThis.String(message.id),
          ),
          h.OnClick(
            Message.ClickedVirtualListChatToggleMessage({
              messageId: message.id,
            }),
          ),
        ],
        [
          h.span([], [message.body]),
          ...(message.isExpanded
            ? [
                h.span(
                  [h.Class(chatMessageDetailClassName)],
                  [
                    'There are a few more details in the PR, including the focus and keyboard checks.',
                  ],
                ),
              ]
            : []),
        ],
      ),
    ],
  )
}

export const virtualListChatDemo = (
  model: VirtualList.Model,
  messages: ReadonlyArray<VirtualListChatMessage>,
  h: HtmlBuilder<Message>,
) => [
  h.div(
    [h.Class('flex w-full flex-col gap-4')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-3')],
        [
          h.div(
            [h.Class('flex flex-col gap-0.5')],
            [
              h.span(
                [
                  h.Class(
                    'text-sm font-semibold text-gray-900 dark:text-gray-100',
                  ),
                ],
                ['Conversation'],
              ),
              h.span(
                [h.Class('text-xs text-gray-500 dark:text-gray-400')],
                [`${messages.length} messages · Click to expand a message`],
              ),
            ],
          ),
          h.div(
            [h.Class('flex w-full items-center sm:ml-auto sm:w-auto')],
            [
              h.button(
                [
                  h.Class(secondaryButtonClassName),
                  h.DataAttribute('virtual-list-chat-prepend', 'true'),
                  h.OnClick(Message.ClickedVirtualListChatPrepend()),
                ],
                ['Load older'],
              ),
            ],
          ),
        ],
      ),
      h.submodel({
        slotId: model.id,
        model,
        view: VirtualList.view<VirtualListChatMessage>(),
        viewInputs: {
          items: messages,
          itemToKey: message => globalThis.String(message.id),
          itemToView: message => chatMessageView(message, h),
          dynamicRowHeights: true,
          itemToEstimatedRowHeightPx: message =>
            message.isExpanded
              ? EXPANDED_CHAT_MESSAGE_ESTIMATED_HEIGHT_PX
              : COLLAPSED_CHAT_MESSAGE_ESTIMATED_HEIGHT_PX,
          contentAlignment: 'End',
          containerClassName:
            'h-96 sm:h-80 w-full rounded-lg bg-gray-100/70 dark:bg-gray-950/40 ring-1 ring-gray-200 dark:ring-gray-800 overscroll-none',
          containerAttributes: childAttributes([
            h.AriaLabel('End-anchored chat messages'),
            h.Tabindex(0),
          ]),
        },
        toParentMessage: message =>
          Message.GotVirtualListChatDemoMessage({ message }),
      }),
      h.div(
        [h.Class('flex w-full items-center justify-between gap-2')],
        [
          h.button(
            [
              h.Class(secondaryButtonClassName),
              h.DataAttribute('virtual-list-chat-scroll-to-message', 'true'),
              h.OnClick(Message.ClickedVirtualListChatScrollToMessage()),
            ],
            [
              h.span([h.Class('sm:hidden')], ['Jump to #7']),
              h.span([h.Class('hidden sm:inline')], ['Jump to message 7']),
            ],
          ),
          h.button(
            [
              h.Class(
                `${buttonClassName} inline-flex h-9 items-center justify-center`,
              ),
              h.DataAttribute('virtual-list-chat-append', 'true'),
              h.OnClick(Message.ClickedVirtualListChatAppend()),
            ],
            ['Add message'],
          ),
        ],
      ),
    ],
  ),
]
