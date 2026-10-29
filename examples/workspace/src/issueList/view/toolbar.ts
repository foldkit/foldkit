import { Array, Option } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Input, Listbox } from '@foldkit/ui'

import { GroupBy, IssueFilters, IssueStatus } from '../../domain'
import {
  GroupListboxOption,
  SortListboxOption,
  StatusFilterListboxOption,
  listboxViewInputs,
} from '../../listbox'
import {
  GroupListboxBinding,
  type IssueListViewBuilder,
  SortListboxBinding,
  StatusListboxBinding,
} from '../composition'
import { Message } from '../message'
import type { Model } from '../model'
import { plusIcon, searchIcon, statusLabel } from './controls'

const FIELD_CLASS = 'block min-w-0 space-y-1.5 @lg:max-w-40 @4xl:max-w-none'
const LABEL_CLASS = 'block text-[13px] font-medium text-slate-600'

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
  h: IssueListViewBuilder,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label(
        [h.For(Listbox.buttonId(model.statusListbox.id)), h.Class(LABEL_CLASS)],
        ['Status'],
      ),
      h.block(
        StatusListboxBinding.embedView({
          slotId: model.statusListbox.id,
          model: model.statusListbox,
          viewInputs: listboxViewInputs({
            value: Option.getOrElse(filters.maybeStatus, () => 'All'),
            options: STATUS_OPTIONS,
            isCompact: true,
            ariaLabel: 'Filter by status',
          }),
        }),
      ),
    ],
  )

const sortView = (
  model: Model,
  filters: IssueFilters,
  h: IssueListViewBuilder,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label(
        [h.For(Listbox.buttonId(model.sortListbox.id)), h.Class(LABEL_CLASS)],
        ['Sort'],
      ),
      h.block(
        SortListboxBinding.embedView({
          slotId: model.sortListbox.id,
          model: model.sortListbox,
          viewInputs: listboxViewInputs({
            value: filters.sort,
            options: SORT_OPTIONS,
            isCompact: true,
            ariaLabel: 'Sort issues',
          }),
        }),
      ),
    ],
  )

const groupView = (
  model: Model,
  filters: IssueFilters,
  h: IssueListViewBuilder,
): Html =>
  h.div(
    [h.Class(FIELD_CLASS)],
    [
      h.label(
        [h.For(Listbox.buttonId(model.groupListbox.id)), h.Class(LABEL_CLASS)],
        ['Group'],
      ),
      h.block(
        GroupListboxBinding.embedView({
          slotId: model.groupListbox.id,
          model: model.groupListbox,
          viewInputs: listboxViewInputs({
            value: filters.groupBy,
            options: GROUP_OPTIONS,
            isCompact: true,
            ariaLabel: 'Group issues',
          }),
        }),
      ),
    ],
  )

const savedViewForm = (
  model: Model,
  filters: IssueFilters,
  h: IssueListViewBuilder,
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

export const filterToolbarView = (
  model: Model,
  filters: IssueFilters,
  isCreationDisabled: boolean,
  h: IssueListViewBuilder,
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

export const listSummaryView = (
  model: Model,
  filters: IssueFilters,
  issueCount: number,
  h: IssueListViewBuilder,
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
