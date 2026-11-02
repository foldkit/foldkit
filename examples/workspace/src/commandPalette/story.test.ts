import { Effect } from 'effect'
import { inMessage } from 'foldkit/story'
import * as Story from 'foldkit/story'
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

import { Dialog, DialogBlock } from '@foldkit/ui'

import { layer } from './block'
import { ScrollActiveResult } from './command'
import { CommandPaletteBlock } from './definition'
import { InMessage } from './inMessage'
import { Message } from './message'
import { OutMessage } from './outMessage'
import { ResultTarget } from './resultTarget'

describe('CommandPaletteBlock', () => {
  test('initializes closed and resets its search when the user closes it', () => {
    return Effect.runPromise(
      Story.withBlock(CommandPaletteBlock, executable =>
        Effect.gen(function* () {
          const paletteInit = executable.init()

          expect(paletteInit.model.dialog.isOpen).toBe(false)

          yield* story(
            CommandPaletteBlock,
            given(paletteInit.model),
            inMessage(InMessage.RequestedOpen()),
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
            inMessage(InMessage.RequestedClose()),
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
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('declares public open and close operations and selects an issue', () => {
    return Effect.runPromise(
      Story.withBlock(CommandPaletteBlock, executable => {
        const update = executable.update

        const paletteInit = executable.init()
        const paletteOpen = executable.operations.requestOpen(paletteInit.model)
        const paletteClose = executable.operations.requestClose(
          paletteOpen.model,
        )

        expect(paletteOpen.model.dialog.isOpen).toBe(true)
        expect(paletteClose.model.dialog.isOpen).toBe(false)

        story(
          update,
          given(paletteOpen.model),
          message(
            Message.ClickedResult({
              target: ResultTarget.Issue({ issueId: 'issue-101' }),
            }),
          ),
          expectOutMessage(OutMessage.SelectedIssue({ issueId: 'issue-101' })),
          Command.resolve(
            Dialog.test.CloseDialog,
            DialogBlock.Message.CompletedCloseDialog(),
          ),
          model(model => {
            expect(model.dialog.isOpen).toBe(false)
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
