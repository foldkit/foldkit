import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  story,
} from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import {
  CommandPaletteLive,
  Message,
  OutMessage,
  ResultTarget,
  ScrollActiveResult,
} from './commandPalette'

const showDialog = Command.resolve(
  Dialog.test.ShowDialog,
  Dialog.Dialog.Message.SucceededShowDialog(),
)
const closeDialog = Command.resolve(
  Dialog.test.CloseDialog,
  Dialog.Dialog.Message.CompletedCloseDialog(),
)

describe('CommandPalette', () => {
  it.effect('starts closed and resets its search when the user closes it', () =>
    story(
      CommandPaletteLive,
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
      }),
      message(Message.RequestedOpen()),
      showDialog,
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
      closeDialog,
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
        expect(model.query).toBe('')
        expect(model.activeResultIndex).toBe(0)
      }),
      expectNoOutMessage(),
    ),
  )

  it.effect('opens and closes on request and selects an issue', () =>
    story(
      CommandPaletteLive,
      message(Message.RequestedOpen()),
      showDialog,
      model(model => {
        expect(model.dialog.isOpen).toBe(true)
      }),
      message(
        Message.ClickedResult({
          target: ResultTarget.Issue({ issueId: 'issue-101' }),
        }),
      ),
      expectOutMessage(OutMessage.SelectedIssue({ issueId: 'issue-101' })),
      closeDialog,
      model(model => {
        expect(model.dialog.isOpen).toBe(false)
      }),
      Command.expectNone(),
    ),
  )
})
