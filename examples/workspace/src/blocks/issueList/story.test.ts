import { Option, Schema } from 'effect'
import { Story } from 'foldkit'
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
    return Story.story(
      { block: IssueListBlock, layer },
      Story.init(),
      Story.message(Message.UpdatedQuery({ value: 'keyboard' })),
      Story.expectOutMessage(OutMessage.ChangedQuery({ query: 'keyboard' })),
      Story.message(Message.UpdatedGrouping({ value: 'Status' })),
      Story.expectOutMessage(OutMessage.ChangedGrouping({ groupBy: 'Status' })),
      Story.message(Message.UpdatedSort({ value: 'Priority' })),
      Story.expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
      Story.message(Message.UpdatedStatusFilter({ value: 'All' })),
      Story.expectOutMessage(
        OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
      ),
      Story.Command.expectNone(),
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
    return Story.story(
      { block: IssueListBlock, layer },
      Story.init(),
      Story.models(
        Story.steps(
          Story.messageIn(
            StatusListboxBinding,
            StatusFilterListboxBlock.Message.RequestedSelectItem({
              item: 'Todo',
            }),
          ),
          Story.expectOutMessage(
            OutMessage.ChangedStatusFilter({
              maybeStatus: Option.some('Todo'),
            }),
          ),
          Story.messageIn(
            SortListboxBinding,
            SortListboxBlock.Message.RequestedSelectItem({
              item: 'Priority',
            }),
          ),
          Story.expectOutMessage(OutMessage.ChangedSort({ sort: 'Priority' })),
          Story.messageIn(
            GroupListboxBinding,
            GroupListboxBlock.Message.RequestedSelectItem({
              item: 'Project',
            }),
          ),
          Story.expectOutMessage(
            OutMessage.ChangedGrouping({ groupBy: 'Project' }),
          ),
          Story.messageIn(
            StatusListboxBinding,
            StatusFilterListboxBlock.Message.RequestedSelectItem({
              item: 'All',
            }),
          ),
          Story.expectOutMessage(
            OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() }),
          ),
        ),
        (before, after) => expect(after).toEqual(before),
      ),
      Story.Command.expectNone(),
    )
  })
})
