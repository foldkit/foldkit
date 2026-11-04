import {} from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  inMessage,
  init,
  message,
  model,
  story,
  withBlock,
} from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { layer } from './block'
import { ScrollActiveResult } from './command'
import { CommandPaletteBlock } from './definition'
import { InMessage } from './inMessage'
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
          DialogTest.ShowDialog,
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
        inMessage(InMessage.RequestedClose()),
        Command.resolve(
          DialogTest.CloseDialog,
          DialogBlock.Message.CompletedCloseDialog(),
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
      return withBlock({ block: CommandPaletteBlock, layer }, executable => {
        const paletteInit = executable.init()

        const paletteOpen = executable.operations.requestOpen(paletteInit.model)

        const paletteClose = executable.operations.requestClose(
          paletteOpen.model,
        )

        expect(paletteOpen.model.dialog.isOpen).toBe(true)

        expect(paletteClose.model.dialog.isOpen).toBe(false)
        return story(
          { block: CommandPaletteBlock, layer },
          given(paletteOpen.model),
          message(
            Message.ClickedResult({
              target: ResultTarget.Issue({ issueId: 'issue-101' }),
            }),
          ),
          expectOutMessage(OutMessage.SelectedIssue({ issueId: 'issue-101' })),
          Command.resolve(
            DialogTest.CloseDialog,
            DialogBlock.Message.CompletedCloseDialog(),
          ),
          model(model => {
            expect(model.dialog.isOpen).toBe(false)
          }),
          Command.expectNone(),
        )
      })
    },
  )
})
