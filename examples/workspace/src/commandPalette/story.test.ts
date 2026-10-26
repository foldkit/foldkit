import {
  Command,
  expectNoOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Dialog, DialogBlock } from '@foldkit/ui'

import { CommandPaletteBlock } from './block'
import { ScrollActiveResult } from './command'
import { Message, ResultTarget } from './definition'
import { update } from './update'

describe('CommandPaletteBlock', () => {
  test('initializes closed and resets its search when the user closes it', () => {
    const paletteInit = CommandPaletteBlock.init()

    expect(paletteInit.model.dialog.isOpen).toBe(false)

    story(
      update,
      given(paletteInit.model),
      message(Message.RequestedOpen()),
      Command.resolve(
        Dialog.test.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
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
      message(Message.RequestedClose()),
      Command.resolve(
        Dialog.test.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
        expect(model.query).toBe('')
        expect(model.activeResultIndex).toBe(0)
      }),
      expectNoOutMessage(),
    )
  })

  test('declares public open and close operations and ignores selection while closed', () => {
    const paletteInit = CommandPaletteBlock.init()
    const paletteOpen = CommandPaletteBlock.operations.requestOpen(
      paletteInit.model,
    )
    const paletteClose = CommandPaletteBlock.operations.requestClose(
      paletteOpen.model,
    )

    expect(paletteOpen.model.dialog.isOpen).toBe(true)
    expect(paletteClose.model.dialog.isOpen).toBe(false)

    story(
      update,
      given(paletteInit.model),
      message(
        Message.ClickedResult({
          target: ResultTarget.Issue({ issueId: 'issue-101' }),
        }),
      ),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })
})
