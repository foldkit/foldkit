import { Option, Schema } from 'effect'
import type { Block } from 'foldkit'

import { GroupBy, IssueFilters, IssueStatus } from '../domain'
import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
  StatusFilterValue,
} from '../listbox'
import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeOutMessageStep,
} from './definition'
import { OutMessage } from './outMessage'

const changeStatusFilter = (value: StatusFilterValue) => {
  if (value === 'All') {
    return makeOutMessageStep(() =>
      OutMessage.ChangedStatusFilter({
        maybeStatus: Option.none(),
      }),
    )
  }

  if (Schema.is(IssueStatus)(value)) {
    return makeOutMessageStep(() =>
      OutMessage.ChangedStatusFilter({
        maybeStatus: Option.some(value),
      }),
    )
  }

  return makeNoopStep()
}

const changeSort = (value: typeof IssueFilters.fields.sort.Type) =>
  Schema.is(IssueFilters.fields.sort)(value)
    ? makeOutMessageStep(() => OutMessage.ChangedSort({ sort: value }))
    : makeNoopStep()

const changeGrouping = (value: GroupBy) =>
  Schema.is(GroupBy)(value)
    ? makeOutMessageStep(() => OutMessage.ChangedGrouping({ groupBy: value }))
    : makeNoopStep()

export const StatusListboxBinding = makeBinding(StatusFilterListboxBlock, {
  field: 'statusListbox',
  init: {
    contextToArgs: () => [{ id: 'issue-list-filter-by-status' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StatusFilterListboxBlock, {
    Selected: ({ value }) => changeStatusFilter(value),
  }),
})

export const SortListboxBinding = makeBinding(SortListboxBlock, {
  field: 'sortListbox',
  init: { contextToArgs: () => [{ id: 'issue-list-sort-issues' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SortListboxBlock, {
    Selected: ({ value }) => changeSort(value),
  }),
})

export const GroupListboxBinding = makeBinding(GroupListboxBlock, {
  field: 'groupListbox',
  init: { contextToArgs: () => [{ id: 'issue-list-group-issues' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(GroupListboxBlock, {
    Selected: ({ value }) => changeGrouping(value),
  }),
})

export const IssueListComposition = makeComposition({
  bindings: [StatusListboxBinding, SortListboxBinding, GroupListboxBinding],
})
export type IssueListViewBuilder = Block.ViewBuilderFor<
  typeof IssueListComposition
>
