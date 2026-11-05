import {} from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  inMessage,
  init,
  message,
  model,
  story,
} from 'foldkit/story'
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
      return story(
        { block: CommandPaletteBlock, layer },
        init(),
        model(model => {
          expect(model.dialog.isOpen).toBe(false)
        }),
        inMessage(InMessage.RequestedOpen()),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        message(Message.UpdatedQuery({ value: 'workspace' })),
        Command.resolve(
          ScrollActiveResult({ index: 0 }),
          Message.CompletedScrollActiveResult(),
        ),
        message(Message.PressedNextResult({ resultCount: 3 })),
        Command.resolve(
          ScrollActiveResult({ index: 1 }),
          Message.CompletedScrollActiveResult(),
        ),
        inMessage(InMessage.RequestedClose()),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        model(model => {
          expect(model.dialog.isOpen).toBe(false)
          expect(model.query).toBe('')
          expect(model.activeResultIndex).toBe(0)
        }),
        expectNoOutMessage(),
      )
    },
  )

  it.effect(
    'declares public open and close operations and selects an issue',
    () => {
      return story(
        { block: CommandPaletteBlock, layer },
        init(),
        inMessage(InMessage.RequestedOpen()),
        model(model => expect(model.dialog.isOpen).toBe(true)),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        inMessage(InMessage.RequestedClose()),
        model(model => expect(model.dialog.isOpen).toBe(false)),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        inMessage(InMessage.RequestedOpen()),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        message(
          Message.ClickedResult({
            target: ResultTarget.Issue({ issueId: 'issue-101' }),
          }),
        ),
        expectOutMessage(OutMessage.SelectedIssue({ issueId: 'issue-101' })),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        model(model => expect(model.dialog.isOpen).toBe(false)),
        Command.expectNone(),
      )
    },
  )
})
