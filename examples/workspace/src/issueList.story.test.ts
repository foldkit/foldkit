import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  story,
} from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { IssueList, IssueListLive, Message, OutMessage } from './issueList'
import { GroupListbox, SortListbox, StatusFilterListbox } from './listbox'

const statusListboxMessage = (
  listboxMessage: typeof StatusFilterListbox.Message.Type,
) => Block.deliver(StatusFilterListbox, 'statusListbox', listboxMessage)

const sortListboxMessage = (listboxMessage: typeof SortListbox.Message.Type) =>
  Block.deliver(SortListbox, 'sortListbox', listboxMessage)

const groupListboxMessage = (
  listboxMessage: typeof GroupListbox.Message.Type,
) => Block.deliver(GroupListbox, 'groupListbox', listboxMessage)

const decodeStatusListboxMessage = Schema.decodeUnknownSync(
  StatusFilterListbox.Message,
)

describe('IssueList', () => {
  it.effect('emits controlled filter changes from typed local facts', () =>
    story(
      IssueListLive,
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
    ),
  )

  it('rejects unknown filter values when decoding Messages', () => {
    const decodeMessage = Schema.decodeUnknownOption(IssueList.Message)

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

  it.effect('reports a clear filters request from its parent', () =>
    story(
      IssueListLive,
      message(IssueList.Message.RequestedClearFilters()),
      expectOutMessage(OutMessage.RequestedClearFilters()),
      Command.expectNone(),
    ),
  )

  it.effect('folds Listbox selections into controlled filter changes', () => {
    const observedModels: Array<unknown> = []

    return story(
      IssueListLive,
      model(model => {
        observedModels.push(model)
      }),
      message(
        statusListboxMessage(
          StatusFilterListbox.Message.RequestedSelectItem({ item: 'Todo' }),
        ),
      ),
      expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.some('Todo') }),
      ),
      message(
        sortListboxMessage(
          SortListbox.Message.RequestedSelectItem({ item: 'Priority' }),
        ),
      ),
      expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
      message(
        groupListboxMessage(
          GroupListbox.Message.RequestedSelectItem({ item: 'Project' }),
        ),
      ),
      expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Project' })),
      message(
        statusListboxMessage(
          StatusFilterListbox.Message.RequestedSelectItem({ item: 'All' }),
        ),
      ),
      expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
      ),
      message(
        statusListboxMessage(
          decodeStatusListboxMessage({
            _tag: 'RequestedSelectItem',
            item: 'Unknown',
          }),
        ),
      ),
      expectNoOutMessage(),
      model(model => {
        expect(model).toEqual(observedModels[0])
      }),
      Command.expectNone(),
    )
  })
})
