import {} from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { CommandPaletteBlock } from './block'
import { ScrollActiveResult } from './command'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { Message } from './message'
import { OutMessage } from './outMessage'
import { ResultTarget } from './resultTarget'

describe('CommandPaletteBlock', () => {
  it.effect(
    'initializes closed and resets its search when the user closes it',
    () => {
      return Story.story(
        { block: CommandPaletteBlock, layer },
        Story.init(),
        Story.model(model => {
          expect(model.dialog.isOpen).toBe(false)
        }),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.message(Message.UpdatedQuery({ value: 'workspace' })),
        Story.Command.resolve(
          ScrollActiveResult({ index: 0 }),
          Message.CompletedScrollActiveResult(),
        ),
        Story.message(Message.PressedNextResult({ resultCount: 3 })),
        Story.Command.resolve(
          ScrollActiveResult({ index: 1 }),
          Message.CompletedScrollActiveResult(),
        ),
        Story.inMessage(InMessage.RequestedClose()),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        Story.model(model => {
          expect(model.dialog.isOpen).toBe(false)
          expect(model.query).toBe('')
          expect(model.activeResultIndex).toBe(0)
        }),
        Story.expectNoOutMessage(),
      )
    },
  )

  it.effect(
    'declares public open and close operations and selects an issue',
    () => {
      return Story.story(
        { block: CommandPaletteBlock, layer },
        Story.init(),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.model(model => expect(model.dialog.isOpen).toBe(true)),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.inMessage(InMessage.RequestedClose()),
        Story.model(model => expect(model.dialog.isOpen).toBe(false)),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.message(
          Message.ClickedResult({
            target: ResultTarget.Issue({ issueId: 'issue-101' }),
          }),
        ),
        Story.expectOutMessage(
          OutMessage.SelectedIssue({ issueId: 'issue-101' }),
        ),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        Story.model(model => expect(model.dialog.isOpen).toBe(false)),
        Story.Command.expectNone(),
      )
    },
  )
})
