import { Array, Match as M, Option, pipe } from 'effect'
import { Ui } from 'foldkit'

import { Class, OnClick, button, div, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  ClickedVirtualListScrollToMiddle,
  ClickedVirtualListVariableScrollToMiddle,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const virtualListHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'virtual-list',
  text: 'VirtualList',
}

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
  return M.value(verb).pipe(
    M.withReturnType<string>(),
    M.when('pushed to', () => cycle(branchNames, index)),
    M.whenOr('opened', 'closed', 'reopened', () => `issue #${number}`),
    M.orElse(() => `PR #${number}`),
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
  'text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums'

const buttonClassName =
  'rounded bg-accent-600 hover:bg-accent-700 cursor-pointer px-3 py-1.5 text-sm font-medium text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2'

const headerClassName =
  'flex items-end justify-between text-sm text-gray-600 dark:text-gray-400'

export const virtualListDemo = (
  model: Ui.VirtualList.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('flex flex-col gap-4 w-full')],
    [
      div(
        [Class(headerClassName)],
        [
          span([], [`${ROW_COUNT.toLocaleString()} activity events`]),
          button(
            [
              Class(buttonClassName),
              OnClick(toParentMessage(ClickedVirtualListScrollToMiddle())),
            ],
            ['Jump to middle'],
          ),
        ],
      ),
      Ui.VirtualList.view({
        model,
        items: sampleActivities,
        itemToKey: row => String(row.id),
        itemToView: row =>
          div(
            [Class(rowClassName)],
            [
              div([Class(avatarClassName(row.colorClass))], [row.initial]),
              div(
                [Class(activityTextClassName)],
                [
                  span([Class(actorClassName)], [row.actor]),
                  ' ',
                  row.verb,
                  ' ',
                  span([Class(targetClassName)], [row.target]),
                ],
              ),
              div([Class(timeAgoClassName)], [row.timeAgo]),
            ],
          ),
        className: containerClassName,
      }),
    ],
  ),
]

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
  'mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-tight line-clamp-1'

const variableArtifactClassName =
  'mt-1 inline-flex w-fit rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:text-gray-300'

const variableTallRow = (row: Activity, summary: Summary) =>
  div(
    [Class(variableTallRowClassName)],
    [
      div([Class(avatarClassName(row.colorClass))], [row.initial]),
      div(
        [Class('min-w-0')],
        [
          div(
            [Class(activityTextClassName)],
            [
              span([Class(actorClassName)], [row.actor]),
              ' ',
              row.verb,
              ' ',
              span([Class(targetClassName)], [row.target]),
            ],
          ),
          div([Class(variableSummaryTitleClassName)], [summary.title]),
          div([Class(variableSummaryBodyClassName)], [summary.body]),
          div([Class(variableArtifactClassName)], [summary.artifact]),
        ],
      ),
      div([Class(timeAgoClassName)], [row.timeAgo]),
    ],
  )

const variableShortRow = (row: Activity) =>
  div(
    [Class(rowClassName)],
    [
      div([Class(avatarClassName(row.colorClass))], [row.initial]),
      div(
        [Class(activityTextClassName)],
        [
          span([Class(actorClassName)], [row.actor]),
          ' ',
          row.verb,
          ' ',
          span([Class(targetClassName)], [row.target]),
        ],
      ),
      div([Class(timeAgoClassName)], [row.timeAgo]),
    ],
  )

export const virtualListVariableDemo = (
  model: Ui.VirtualList.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('flex flex-col gap-4 w-full')],
    [
      div(
        [Class(headerClassName)],
        [
          span(
            [],
            [
              'Mixed-height rows: every fourth row is taller and shows a summary',
            ],
          ),
          button(
            [
              Class(buttonClassName),
              OnClick(
                toParentMessage(ClickedVirtualListVariableScrollToMiddle()),
              ),
            ],
            ['Jump to middle'],
          ),
        ],
      ),
      Ui.VirtualList.view({
        model,
        items: variableActivities,
        itemToKey: row => String(row.id),
        itemToRowHeightPx: variableRowHeightPx,
        itemToView: (row, index) =>
          row.hasSummary
            ? variableTallRow(row, summaryFor(index))
            : variableShortRow(row),
        className: containerClassName,
      }),
    ],
  ),
]
