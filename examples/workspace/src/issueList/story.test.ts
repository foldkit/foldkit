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
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
} from '../listbox'
import { IssueListBlock } from './block'
import {
  GroupListboxBinding,
  SortListboxBinding,
  StatusListboxBinding,
} from './composition'
import { Message } from './message'
import { OutMessage } from './outMessage'
import { update } from './update'

type StatusFilterListboxMessage = typeof StatusFilterListboxBlock.Message.Type
type SortListboxMessage = typeof SortListboxBlock.Message.Type
type GroupListboxMessage = typeof GroupListboxBlock.Message.Type

const statusListboxMessage = (message: StatusFilterListboxMessage) =>
  toParentMessage(StatusListboxBinding, message)

const sortListboxMessage = (message: SortListboxMessage) =>
  toParentMessage(SortListboxBinding, message)

const groupListboxMessage = (message: GroupListboxMessage) =>
  toParentMessage(GroupListboxBinding, message)

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
          SortListboxBlock.Message.RequestedSelectItem({
            item: 'Priority',
          }),
        ),
      ),
      expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
      message(
        groupListboxMessage(
          GroupListboxBlock.Message.RequestedSelectItem({
            item: 'Project',
          }),
        ),
      ),
      expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Project' })),
      message(
        statusListboxMessage(
          StatusFilterListboxBlock.Message.RequestedSelectItem({ item: 'All' }),
        ),
      ),
      expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
      ),
      message(
        statusListboxMessage(
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
