import { Option, Schema } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  init,
  message,
  messageFrom,
  models,
  story,
  steps,
} from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
} from '../../listbox'
import { IssueListBlock } from './block'
import {
  GroupListboxBinding,
  SortListboxBinding,
  StatusListboxBinding,
} from './composition'
import { layer } from './layer'
import { Message } from './message'
import { OutMessage } from './outMessage'

describe('IssueListBlock', () => {
  it.effect('emits controlled filter changes from typed local facts', () => {
    return story(
      { block: IssueListBlock, layer },
      init(),
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

  it('rejects unknown filter values when decoding Messages', () => {
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

  it.effect('folds Listbox selections into controlled filter changes', () => {
    return story(
      { block: IssueListBlock, layer },
      init(),
      models(
        steps(
          messageFrom(
            StatusListboxBinding,
            StatusFilterListboxBlock.Message.RequestedSelectItem({
              item: 'Todo',
            }),
          ),
          expectOutMessage(
            OutMessage.ChangedStatusFilter({
              maybeStatus: Option.some('Todo'),
            }),
          ),
          messageFrom(
            SortListboxBinding,
            SortListboxBlock.Message.RequestedSelectItem({
              item: 'Priority',
            }),
          ),
          expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
          messageFrom(
            GroupListboxBinding,
            GroupListboxBlock.Message.RequestedSelectItem({
              item: 'Project',
            }),
          ),
          expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Project' })),
          messageFrom(
            StatusListboxBinding,
            StatusFilterListboxBlock.Message.RequestedSelectItem({
              item: 'All',
            }),
          ),
          expectOutMessage(
            OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
          ),
          messageFrom(
            StatusListboxBinding,
            StatusFilterListboxBlock.Message.RequestedSelectItem({
              item: 'Unknown',
            }),
          ),
          expectNoOutMessage(),
        ),
        (before, after) => expect(after).toEqual(before),
      ),
      Command.expectNone(),
    )
  })
})
