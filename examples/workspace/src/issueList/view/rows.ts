import { clsx } from 'clsx'
import { Array, Match, Option, Record } from 'effect'
import type { Html } from 'foldkit/html'

import { type Issue, type IssueFilters, IssueStatus } from '../../domain'
import type { IssueListViewBuilder } from '../composition'
import type { ViewInputs } from '../viewInputs'
import { statusLabel } from './controls'

const ROW_CLASS =
  'grid w-full grid-cols-[4.5rem_minmax(0,1fr)_1.75rem] items-center gap-x-3 gap-y-2 px-4 py-4 text-left text-sm font-medium @lg:grid-cols-[4.5rem_6.5rem_minmax(0,1fr)_1.75rem] @lg:px-5 @3xl:grid-cols-[4.5rem_6.5rem_minmax(0,1fr)_4rem_1.75rem]'

const issueRow = (
  issue: Issue,
  viewInputs: ViewInputs,
  h: IssueListViewBuilder,
): Html => {
  const maybeAssignee = Option.flatMap(issue.maybeAssigneeId, memberId =>
    Array.findFirst(viewInputs.members, member => member.id === memberId),
  )
  const isActive = Option.contains(viewInputs.maybeActiveIssueId, issue.id)

  const content = [
    h.span(
      [
        h.Class(
          'col-start-1 row-start-1 min-w-0 truncate text-xs font-medium text-slate-500 tabular-nums',
        ),
      ],
      [issue.identifier],
    ),
    h.span(
      [
        h.Class(
          'col-start-2 row-start-1 w-fit justify-self-start rounded border border-slate-200 px-1.5 py-0.5 text-center text-xs font-medium whitespace-nowrap text-slate-500 data-[status=InProgress]:border-amber-200 data-[status=InProgress]:bg-amber-50 data-[status=InProgress]:text-amber-700 data-[status=Done]:border-emerald-200 data-[status=Done]:bg-emerald-50 data-[status=Done]:text-emerald-700',
        ),
        h.DataAttribute('status', issue.status),
      ],
      [statusLabel(issue.status)],
    ),
    h.span(
      [
        h.Class(
          'col-span-full row-start-2 min-w-0 text-sm font-medium leading-relaxed text-slate-700 @lg:col-span-1 @lg:col-start-3 @lg:row-start-1',
        ),
      ],
      [issue.title],
    ),
    h.span(
      [
        h.Class(
          'col-start-4 row-start-1 hidden text-right text-xs font-medium text-slate-500 @3xl:block',
        ),
      ],
      [issue.priority],
    ),
    h.span(
      [
        h.Class(
          'col-start-3 row-start-1 grid size-7 place-items-center justify-self-end rounded-full bg-indigo-50 text-xs font-medium text-indigo-600 @lg:col-start-4 @3xl:col-start-5',
        ),
        h.AriaLabel('Assignee'),
      ],
      [
        Option.match(maybeAssignee, {
          onNone: () => '–',
          onSome: member => member.initials,
        }),
      ],
    ),
  ]

  const accessibleName = `${issue.identifier} ${issue.title}`

  const row = Option.match(Record.get(viewInputs.issueHrefs, issue.id), {
    onNone: () =>
      h.div(
        [
          h.Class(
            clsx(ROW_CLASS, {
              'bg-indigo-50': isActive,
              'bg-white': !isActive,
            }),
          ),
          h.AriaLabel(accessibleName),
        ],
        content,
      ),
    onSome: href =>
      h.a(
        [
          h.Href(href),
          h.Class(
            clsx(ROW_CLASS, 'cursor-pointer', {
              'bg-indigo-50 hover:bg-indigo-100': isActive,
              'bg-white hover:bg-slate-50': !isActive,
            }),
          ),
          h.AriaLabel(accessibleName),
        ],
        content,
      ),
  })

  return h.keyed('li')(
    issue.id,
    [
      h.Class(
        clsx('border-b border-slate-100', {
          'bg-indigo-50': isActive,
          'bg-white': !isActive,
        }),
      ),
    ],
    [row],
  )
}

const issueGroupView = (
  id: string,
  title: string,
  issues: ReadonlyArray<Issue>,
  viewInputs: ViewInputs,
  h: IssueListViewBuilder,
): Html =>
  Array.isReadonlyArrayEmpty(issues)
    ? h.empty
    : h.keyed('section')(
        id,
        [h.Class('border-b border-slate-200')],
        [
          h.h2(
            [h.Class('bg-slate-50 px-5 py-3 text-slate-600')],
            [
              h.span([h.Class('text-sm font-semibold')], [title]),
              h.span([h.Class('text-xs font-medium')], [` · ${issues.length}`]),
            ],
          ),
          h.ul(
            [h.Class('m-0 list-none p-0')],
            Array.map(issues, issue => issueRow(issue, viewInputs, h)),
          ),
        ],
      )

export const issueGroupsView = (
  issues: ReadonlyArray<Issue>,
  filters: IssueFilters,
  viewInputs: ViewInputs,
  h: IssueListViewBuilder,
): Html =>
  Match.value(filters.groupBy).pipe(
    Match.when('None', () =>
      h.ul(
        [h.Class('m-0 list-none p-0')],
        Array.map(issues, issue => issueRow(issue, viewInputs, h)),
      ),
    ),
    Match.when('Status', () =>
      h.div(
        [],
        Array.map(IssueStatus.literals, status =>
          issueGroupView(
            status,
            statusLabel(status),
            Array.filter(issues, issue => issue.status === status),
            viewInputs,
            h,
          ),
        ),
      ),
    ),
    Match.when('Project', () =>
      h.div(
        [],
        Array.map(viewInputs.projects, project =>
          issueGroupView(
            project.id,
            project.name,
            Array.filter(issues, issue => issue.projectId === project.id),
            viewInputs,
            h,
          ),
        ),
      ),
    ),
    Match.exhaustive,
  )
