import { Option } from 'effect'
import type { Block } from 'foldkit'

import { Issue } from '../../domain'
import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
  StatusFilterValue,
} from '../../listbox'
import {
  makeComposition,
  makeOutMessageFold,
  makeOutMessageStep,
  makeRequiredFieldBinding,
} from './block'
import { OutMessage } from './outMessage'

const changeStatusFilter = (value: StatusFilterValue) => {
  if (value === 'All') {
    return makeOutMessageStep(() =>
      OutMessage.ChangedStatusFilter({
        maybeStatus: Option.none(),
      }),
    )
  }

  return makeOutMessageStep(() =>
    OutMessage.ChangedStatusFilter({
      maybeStatus: Option.some(value),
    }),
  )
}

const changeSort = (value: Issue.SortBy) =>
  makeOutMessageStep(() => OutMessage.ChangedSort({ sort: value }))

const changeGrouping = (value: Issue.GroupBy) =>
  makeOutMessageStep(() => OutMessage.ChangedGrouping({ groupBy: value }))

export const StatusListboxBinding = makeRequiredFieldBinding(
  StatusFilterListboxBlock,
  {
    field: 'statusListbox',
    init: {
      contextToArgs: () => [{ id: 'issue-list-filter-by-status' }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(StatusFilterListboxBlock, {
    Selected: ({ value }) => changeStatusFilter(value),
  }),
})

export const SortListboxBinding = makeRequiredFieldBinding(SortListboxBlock, {
  field: 'sortListbox',
  init: { contextToArgs: () => [{ id: 'issue-list-sort-issues' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SortListboxBlock, {
    Selected: ({ value }) => changeSort(value),
  }),
})

export const GroupListboxBinding = makeRequiredFieldBinding(GroupListboxBlock, {
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
