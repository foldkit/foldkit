import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Layer,
  Match,
  Option,
  Order,
  Record,
  Schema,
  String,
} from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Input, Listbox } from '@foldkit/ui'

import {
  GroupBy,
  Issue,
  IssueFilters,
  IssueStatus,
  Member,
  Project,
} from './domain/domain'
import {
  GroupListbox,
  GroupListboxOption,
  SortListbox,
  SortListboxOption,
  StatusFilterListbox,
  StatusFilterListboxOption,
  StatusFilterValue,
  listboxViewInputs,
} from './listbox'

const FIELD_CLASS = 'block min-w-0 space-y-1.5 @lg:max-w-40 @4xl:max-w-none'
const LABEL_CLASS = 'block text-[13px] font-medium text-slate-600'
const ROW_CLASS =
  'grid w-full grid-cols-[4.5rem_minmax(0,1fr)_1.75rem] items-center gap-x-3 gap-y-2 px-4 py-4 text-left text-sm font-medium @lg:grid-cols-[4.5rem_6.5rem_minmax(0,1fr)_1.75rem] @lg:px-5 @3xl:grid-cols-[4.5rem_6.5rem_minmax(0,1fr)_4rem_1.75rem]'

const Model = Schema.Struct({
  savedViewName: Schema.String,
  statusListbox: StatusFilterListbox,
  sortListbox: SortListbox,
  groupListbox: GroupListbox,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  UpdatedStatusFilter: { value: StatusFilterValue },
  UpdatedSort: { value: IssueFilters.fields.sort },
  ClickedCreateIssue: {},
  RequestedClearFilters: {},
  UpdatedGrouping: { value: GroupBy },
  UpdatedSavedViewName: { value: Schema.String },
  SubmittedSavedView: { filters: IssueFilters },
})
type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedQuery: { query: Schema.String },
  ChangedStatusFilter: { maybeStatus: Schema.Option(IssueStatus) },
  ChangedSort: { sort: IssueFilters.fields.sort },
  ChangedGrouping: { groupBy: GroupBy },
  RequestedClearFilters: {},
  RequestedCreation: {},
  SavedFilter: { name: Schema.String, filters: IssueFilters },
})

const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue),
  members: Schema.Array(Member),
  projects: Schema.Array(Project),
  maybeActiveIssueId: Schema.Option(Schema.String),
  filters: IssueFilters,
  issueHrefs: Schema.Record(Schema.String, Schema.String),
})
export type ViewInputs = typeof ViewInputs.Type

export class IssueList extends Block<IssueList, void, ViewInputs>()(
  'IssueList',
  { Model, Message, OutMessage },
) {}

export const IssueListLive = IssueList.make(
  Effect.fn(function* () {
    const statusListbox = yield* new StatusFilterListbox('statusListbox', {
      id: 'issue-list-filter-by-status',
    })
    const sortListbox = yield* new SortListbox('sortListbox', {
      id: 'issue-list-sort-issues',
    })
    const groupListbox = yield* new GroupListbox('groupListbox', {
      id: 'issue-list-group-issues',
    })

    return {
      model: {
        savedViewName: '',
        statusListbox,
        sortListbox,
        groupListbox,
      },

      update: {
        UpdatedGrouping: (model, { value }) => ({
          model,
          outMessage: OutMessage.ChangedGrouping({ groupBy: value }),
        }),
        UpdatedSavedViewName: (model, { value }) => ({
          model: modifyFields(model, { savedViewName: () => value }),
        }),
        SubmittedSavedView: (model, { filters }) => {
          const name = String.trim(model.savedViewName)

          if (String.isEmpty(name)) {
            return { model }
          }

          return {
            model: modifyFields(model, { savedViewName: () => '' }),
            outMessage: OutMessage.SavedFilter({
              name,
              filters,
            }),
          }
        },
        UpdatedQuery: (model, { value }) => ({
          model,
          outMessage: OutMessage.ChangedQuery({ query: value }),
        }),
        UpdatedStatusFilter: (model, { value }) => {
          if (value === 'All') {
            return {
              model,
              outMessage: OutMessage.ChangedStatusFilter({
                maybeStatus: Option.none(),
              }),
            }
          }

          return {
            model,
            outMessage: OutMessage.ChangedStatusFilter({
              maybeStatus: Option.some(value),
            }),
          }
        },
        UpdatedSort: (model, { value }) => ({
          model,
          outMessage: OutMessage.ChangedSort({ sort: value }),
        }),
        ClickedCreateIssue: model => ({
          model,
          outMessage: OutMessage.RequestedCreation(),
        }),
        RequestedClearFilters: model => ({
          model,
          outMessage: OutMessage.RequestedClearFilters(),
        }),
        ...statusListbox.on({
          Selected: (model, { value }) => selectStatusFilter(model, value),
        }),
        ...sortListbox.on({
          Selected: (model, { value }) => selectSort(model, value),
        }),
        ...groupListbox.on({
          Selected: (model, { value }) => selectGrouping(model, value),
        }),
      },

      view: (model, h, viewInputs) => {
        const issues = filterAndSortIssues(
          viewInputs.filters,
          viewInputs.issues,
        )

        return h.section(
          [
            h.Class('@container min-w-0 flex-1 bg-white text-sm font-medium'),
            h.AriaLabel('Issues'),
          ],
          [
            h.div(
              [
                h.Class(
                  'space-y-3 border-b border-slate-200 px-4 py-4 @lg:px-5',
                ),
              ],
              [
                filterToolbarView(
                  model,
                  viewInputs.filters,
                  Array.isReadonlyArrayEmpty(viewInputs.projects),
                  h,
                ),
                listSummaryView(model, viewInputs.filters, issues.length, h),
              ],
            ),
            Array.match(issues, {
              onEmpty: () =>
                h.div(
                  [
                    h.Class(
                      'p-12 text-center text-sm text-slate-500 [&_h2]:mb-2 [&_h2]:font-semibold',
                    ),
                  ],
                  [
                    h.h2([], ['No matching issues']),
                    h.p([], ['Try another search or status filter.']),
                    Button.view(
                      {
                        onClick: Message.RequestedClearFilters(),
                        toView: attributes =>
                          h.button(
                            [...attributes.button, h.Class('button-compact')],
                            ['Clear filters'],
                          ),
                      },
                      h,
                    ),
                  ],
                ),
              onNonEmpty: issues =>
                issueGroupsView(issues, viewInputs.filters, viewInputs, h),
            }),
          ],
        )
      },
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      StatusFilterListbox.Live,
      SortListbox.Live,
      GroupListbox.Live,
    ),
  ),
)

const priorityOrder = Order.mapInput(Order.Number, (issue: Issue) =>
  Match.value(issue.priority).pipe(
    Match.when('High', () => 0),
    Match.when('Medium', () => 1),
    Match.when('Low', () => 2),
    Match.exhaustive,
  ),
)

const filterAndSortIssues = (
  filters: IssueFilters,
  issues: ReadonlyArray<Issue>,
) => {
  const query = filters.query.toLowerCase().trim()

  const filtered = Array.filter(
    issues,
    issue =>
      `${issue.identifier} ${issue.title}`.toLowerCase().includes(query) &&
      Option.match(filters.maybeStatus, {
        onNone: () => true,
        onSome: status => issue.status === status,
      }),
  )

  return Array.sort(
    filtered,
    filters.sort === 'Priority'
      ? priorityOrder
      : Order.mapInput(Order.String, issue => issue.identifier),
  )
}

const selectStatusFilter = (model: Model, value: StatusFilterValue) => {
  if (value === 'All') {
    return {
      model,
      outMessage: OutMessage.ChangedStatusFilter({
        maybeStatus: Option.none(),
      }),
    }
  }

  if (Schema.is(IssueStatus)(value)) {
    return {
      model,
      outMessage: OutMessage.ChangedStatusFilter({
        maybeStatus: Option.some(value),
      }),
    }
  }

  return { model }
}

const selectSort = (
  model: Model,
  value: typeof IssueFilters.fields.sort.Type,
) =>
  Schema.is(IssueFilters.fields.sort)(value)
    ? { model, outMessage: OutMessage.ChangedSort({ sort: value }) }
    : { model }

const selectGrouping = (model: Model, value: GroupBy) =>
  Schema.is(GroupBy)(value)
    ? { model, outMessage: OutMessage.ChangedGrouping({ groupBy: value }) }
    : { model }

// VIEW

const searchIcon = (h: HtmlBuilder<Message, unknown>): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class(
        'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400',
      ),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
    ],
    [
      h.circle([h.Cx('10.5'), h.Cy('10.5'), h.R('6.5')]),
      h.path([h.D('m16 16 4 4'), h.StrokeLinecap('round')]),
    ],
  )

const plusIcon = (h: HtmlBuilder<Message, unknown>): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class('size-3.5 shrink-0'),
      h.ViewBox('0 0 16 16'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
    ],
    [h.path([h.D('M8 3v10M3 8h10'), h.StrokeLinecap('round')])],
  )

const statusLabel = (status: IssueStatus): string =>
  status === 'InProgress' ? 'In progress' : status

const STATUS_OPTIONS: ReadonlyArray<StatusFilterListboxOption> = [
  { value: 'All', label: 'All statuses' },
  ...Array.map(IssueStatus.literals, status => ({
    value: status,
    label: statusLabel(status),
  })),
]

const SORT_OPTIONS: ReadonlyArray<SortListboxOption> = [
  { value: 'Identifier', label: 'Issue number' },
  { value: 'Priority', label: 'Priority' },
]

const GROUP_OPTIONS: ReadonlyArray<GroupListboxOption> = Array.map(
  GroupBy.literals,
  group => ({ value: group, label: group }),
)

const statusFilterView = (
  model: Model,
  filters: IssueFilters,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label(
        [
          h.For(Listbox.buttonId(model.statusListbox.model.id)),
          h.Class(LABEL_CLASS),
        ],
        ['Status'],
      ),
      model.statusListbox.view(
        listboxViewInputs({
          value: Option.getOrElse(filters.maybeStatus, () => 'All'),
          options: STATUS_OPTIONS,
          isCompact: true,
          ariaLabel: 'Filter by status',
        }),
      ),
    ],
  )

const sortView = (
  model: Model,
  filters: IssueFilters,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label(
        [
          h.For(Listbox.buttonId(model.sortListbox.model.id)),
          h.Class(LABEL_CLASS),
        ],
        ['Sort'],
      ),
      model.sortListbox.view(
        listboxViewInputs({
          value: filters.sort,
          options: SORT_OPTIONS,
          isCompact: true,
          ariaLabel: 'Sort issues',
        }),
      ),
    ],
  )

const groupView = (
  model: Model,
  filters: IssueFilters,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label(
        [
          h.For(Listbox.buttonId(model.groupListbox.model.id)),
          h.Class(LABEL_CLASS),
        ],
        ['Group'],
      ),
      model.groupListbox.view(
        listboxViewInputs({
          value: filters.groupBy,
          options: GROUP_OPTIONS,
          isCompact: true,
          ariaLabel: 'Group issues',
        }),
      ),
    ],
  )

const savedViewForm = (
  model: Model,
  filters: IssueFilters,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.form(
    [
      h.OnSubmit(Message.SubmittedSavedView({ filters })),
      h.Class(
        'ml-auto grid min-w-0 flex-[1_1_16rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 @lg:max-w-80',
      ),
    ],
    [
      Input.view(
        {
          id: 'issue-list-saved-view-name',
          placeholder: 'View name',
          value: model.savedViewName,
          onInput: value => Message.UpdatedSavedViewName({ value }),
          toView: attributes =>
            h.input([
              ...attributes.input,
              h.AriaLabel('Saved view name'),
              h.Required(true),
              h.AriaRequired(true),
              h.Pattern('.*\\S.*'),
              h.Class('input-control-compact'),
            ]),
        },
        h,
      ),
      Button.view(
        {
          type: 'submit',
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class('button-compact')],
              ['Save view'],
            ),
        },
        h,
      ),
    ],
  )

const filterToolbarView = (
  model: Model,
  filters: IssueFilters,
  isCreationDisabled: boolean,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [
      h.Class(
        'grid grid-cols-2 items-end gap-3 @lg:grid-cols-[10rem_9rem_minmax(9rem,1fr)] @4xl:grid-cols-[minmax(12rem,20rem)_10rem_9rem_9rem_minmax(0,1fr)_auto]',
      ),
    ],
    [
      Input.view(
        {
          id: 'issue-list-input-1',
          type: 'search',
          placeholder: 'Search issues…',
          value: filters.query,
          onInput: value => Message.UpdatedQuery({ value }),
          toView: attributes =>
            h.label(
              [
                ...attributes.label,
                h.Class(
                  'relative col-span-2 block min-w-0 @lg:col-span-2 @4xl:col-span-1',
                ),
              ],
              [
                h.span([h.Class('sr-only')], ['Search issues']),
                h.input([
                  ...attributes.input,
                  h.Class('input-control-compact pl-9'),
                ]),
                searchIcon(h),
              ],
            ),
        },
        h,
      ),
      statusFilterView(model, filters, h),
      sortView(model, filters, h),
      groupView(model, filters, h),
      Button.view(
        {
          isDisabled: isCreationDisabled,
          onClick: Message.ClickedCreateIssue(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                ...(isCreationDisabled
                  ? [h.AriaDescription('No projects are available')]
                  : []),
                h.Class(
                  'button-primary-compact ml-auto @lg:col-start-3 @lg:row-start-1 @4xl:col-start-6',
                ),
              ],
              [plusIcon(h), 'New issue'],
            ),
        },
        h,
      ),
    ],
  )

const listSummaryView = (
  model: Model,
  filters: IssueFilters,
  issueCount: number,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class('flex flex-wrap items-center gap-x-4 gap-y-3')],
    [
      h.span(
        [
          h.Class(
            'shrink-0 whitespace-nowrap text-xs font-medium text-slate-600',
          ),
        ],
        [`${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`],
      ),
      savedViewForm(model, filters, h),
    ],
  )

const issueRow = (
  issue: Issue,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message, unknown>,
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
  h: HtmlBuilder<Message, unknown>,
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

const issueGroupsView = (
  issues: ReadonlyArray<Issue>,
  filters: IssueFilters,
  viewInputs: ViewInputs,
  h: HtmlBuilder<Message, unknown>,
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
