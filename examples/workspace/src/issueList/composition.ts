import { Option, Schema } from 'effect'
import type { Block } from 'foldkit'

import { GroupBy, IssueFilters, IssueStatus } from '../domain'
import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
  StatusFilterValue,
} from '../listbox'
import { IssueListDefinition } from './definition'
import { OutMessage } from './message'

const changeStatusFilter = (value: typeof StatusFilterValue.Type) => {
  if (value === 'All') {
    return IssueListDefinition.makeOutMessageStep(() =>
      OutMessage.ChangedStatusFilter({
        maybeStatus: Option.none(),
      }),
    )
  }

  if (Schema.is(IssueStatus)(value)) {
    return IssueListDefinition.makeOutMessageStep(() =>
      OutMessage.ChangedStatusFilter({
        maybeStatus: Option.some(value),
      }),
    )
  }

  return IssueListDefinition.makeNoopStep()
}

const changeSort = (value: typeof IssueFilters.fields.sort.Type) =>
  Schema.is(IssueFilters.fields.sort)(value)
    ? IssueListDefinition.makeOutMessageStep(() =>
        OutMessage.ChangedSort({ sort: value }),
      )
    : IssueListDefinition.makeNoopStep()

const changeGrouping = (value: typeof GroupBy.Type) =>
  Schema.is(GroupBy)(value)
    ? IssueListDefinition.makeOutMessageStep(() =>
        OutMessage.ChangedGrouping({ groupBy: value }),
      )
    : IssueListDefinition.makeNoopStep()

export const StatusListboxBinding = IssueListDefinition.makeBinding(
  StatusFilterListboxBlock,
  {
    field: 'statusListbox',
    init: {
      contextToArgs: () => [{ id: 'issue-list-filter-by-status' }],
    },
  },
).withOutMessagePolicy({
  fold: IssueListDefinition.makeOutMessageFold(StatusFilterListboxBlock, {
    Selected: ({ value }) => changeStatusFilter(value),
  }),
})

export const SortListboxBinding = IssueListDefinition.makeBinding(
  SortListboxBlock,
  {
    field: 'sortListbox',
    init: { contextToArgs: () => [{ id: 'issue-list-sort-issues' }] },
  },
).withOutMessagePolicy({
  fold: IssueListDefinition.makeOutMessageFold(SortListboxBlock, {
    Selected: ({ value }) => changeSort(value),
  }),
})

export const GroupListboxBinding = IssueListDefinition.makeBinding(
  GroupListboxBlock,
  {
    field: 'groupListbox',
    init: { contextToArgs: () => [{ id: 'issue-list-group-issues' }] },
  },
).withOutMessagePolicy({
  fold: IssueListDefinition.makeOutMessageFold(GroupListboxBlock, {
    Selected: ({ value }) => changeGrouping(value),
  }),
})

export const IssueListComposition = IssueListDefinition.makeComposition({
  bindings: [StatusListboxBinding, SortListboxBinding, GroupListboxBinding],
})
export type IssueListViewBuilder = Block.ViewBuilderFor<
  typeof IssueListComposition
>
