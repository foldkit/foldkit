import { Option, Schema } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { GroupBy, IssueFilters } from '../domain'
import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
  StatusFilterValue,
  listboxViewInputs,
} from '../listbox'
import {
  GroupListboxBinding,
  SortListboxBinding,
  StatusListboxBinding,
} from './composition'
import { IssueListBlock } from './issueList'
import { Message, OutMessage } from './message'
import type { Model } from './model'
import { update } from './update'

const statusListboxMessage = (
  model: typeof Model.Type,
  message: typeof StatusFilterListboxBlock.Message.Type,
) =>
  StatusListboxBinding.embedView({
    slotId: model.statusListbox.id,
    model: model.statusListbox,
    viewInputs: listboxViewInputs({
      value: StatusFilterValue.make('All'),
      options: [],
    }),
  }).toParentMessage(message)

const sortListboxMessage = (
  model: typeof Model.Type,
  message: typeof SortListboxBlock.Message.Type,
) =>
  SortListboxBinding.embedView({
    slotId: model.sortListbox.id,
    model: model.sortListbox,
    viewInputs: listboxViewInputs({
      value: IssueFilters.fields.sort.make('Identifier'),
      options: [],
    }),
  }).toParentMessage(message)

const groupListboxMessage = (
  model: typeof Model.Type,
  message: typeof GroupListboxBlock.Message.Type,
) =>
  GroupListboxBinding.embedView({
    slotId: model.groupListbox.id,
    model: model.groupListbox,
    viewInputs: listboxViewInputs({ value: GroupBy.make('None'), options: [] }),
  }).toParentMessage(message)

describe('IssueListBlock', () => {
  test('emits controlled filter changes from typed local facts', () => {
    story(
      update,
      given(IssueListBlock.init().model),
      message(Message.UpdatedQuery({ value: 'keyboard' })),
      expectOutMessage(OutMessage.ChangedQuery({ query: 'keyboard' })),
      message(Message.UpdatedGrouping({ value: 'Status' })),
      expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Status' })),
      message(Message.UpdatedSort({ value: 'Priority' })),
      expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
      message(Message.UpdatedStatusFilter({ value: 'All' })),
      expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
      ),
      Command.expectNone(),
    )
  })

  test('rejects unknown filter values when decoding Messages', () => {
    const decodeMessage = Schema.decodeUnknownOption(IssueListBlock.Message)

    expect(
      decodeMessage({ _tag: 'UpdatedGrouping', value: 'Unknown' }),
    ).toEqual(Option.none())
    expect(decodeMessage({ _tag: 'UpdatedSort', value: 'Unknown' })).toEqual(
      Option.none(),
    )
    expect(
      decodeMessage({ _tag: 'UpdatedStatusFilter', value: 'Unknown' }),
    ).toEqual(Option.none())
  })

  test('folds Listbox selections into controlled filter changes', () => {
    const initialModel = IssueListBlock.init().model

    story(
      update,
      given(initialModel),
      message(
        statusListboxMessage(
          initialModel,
          StatusFilterListboxBlock.Message.RequestedSelectItem({
            item: 'Todo',
          }),
        ),
      ),
      expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.some('Todo') }),
      ),
      message(
        sortListboxMessage(
          initialModel,
          SortListboxBlock.Message.RequestedSelectItem({
            item: 'Priority',
          }),
        ),
      ),
      expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
      message(
        groupListboxMessage(
          initialModel,
          GroupListboxBlock.Message.RequestedSelectItem({
            item: 'Project',
          }),
        ),
      ),
      expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Project' })),
      message(
        statusListboxMessage(
          initialModel,
          StatusFilterListboxBlock.Message.RequestedSelectItem({ item: 'All' }),
        ),
      ),
      expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
      ),
      message(
        statusListboxMessage(
          initialModel,
          StatusFilterListboxBlock.Message.RequestedSelectItem({
            item: 'Unknown',
          }),
        ),
      ),
      expectNoOutMessage(),
      model(model => {
        expect(model).toEqual(initialModel)
      }),
      Command.expectNone(),
    )
  })
})
