import { Array, Option } from 'effect'
import {
  Command,
  Subscription,
  click,
  expect,
  expectHandled,
  expectOutMessage,
  init,
  keydown,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { initialWorkspace } from '../../domain'
import { CommandPaletteBlock, layer } from './block'
import { ScrollActiveResult } from './command'
import { Message } from './message'
import { OutMessage } from './outMessage'
import { subscriptions } from './subscription'

const openFromShortcut = Subscription.emit(
  subscriptions.openShortcut,
  Message.PressedOpenShortcut(),
)
const showDialog = Command.resolve(
  DialogTest.ShowDialog,
  DialogBlock.Message.SucceededShowDialog(),
)
const closeDialog = Command.resolve(
  DialogTest.CloseDialog,
  DialogBlock.Message.CompletedCloseDialog(),
)
const scrollToResult = (index: number) =>
  Command.resolve(
    ScrollActiveResult({ index }),
    Message.CompletedScrollActiveResult(),
  )

describe('command palette search', () => {
  it.effect(
    'opens with the keyboard shortcut and selects an issue with Arrow keys and Enter',
    () => {
      const secondIssue = Option.getOrThrow(
        Array.get(initialWorkspace.issues, 1),
      )

      return scene(
        {
          block: CommandPaletteBlock,
          layer,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        init(),
        openFromShortcut,
        showDialog,
        type(label('Search issues and projects'), 'WSP-10'),
        scrollToResult(0),
        keydown(label('Search issues and projects'), 'ArrowUp'),
        expectHandled(),
        scrollToResult(8),
        expect(role('option', { selected: true })).toContainText('WSP-109'),
        keydown(label('Search issues and projects'), 'ArrowDown'),
        expectHandled(),
        scrollToResult(0),
        keydown(label('Search issues and projects'), 'ArrowDown'),
        expectHandled(),
        scrollToResult(1),
        expect(role('option', { selected: true })).toContainText(
          secondIssue.identifier,
        ),
        keydown(label('Search issues and projects'), 'Enter'),
        expectHandled(),
        expectOutMessage(OutMessage.SelectedIssue({ issueId: secondIssue.id })),
        closeDialog,
        expect(label('Search issues and projects')).not.toExist(),
      )
    },
  )

  it.effect('selects a project from current search inputs', () => {
    return scene(
      {
        block: CommandPaletteBlock,
        layer,
        viewInputs: {
          issues: initialWorkspace.issues,
          projects: initialWorkspace.projects,
        },
      },
      init(),
      openFromShortcut,
      showDialog,
      type(label('Search issues and projects'), 'Platform'),
      scrollToResult(0),
      expect(role('option')).toContainText('Platform'),
      click(role('option')),
      expectOutMessage(OutMessage.SelectedProject({ projectId: 'platform' })),
      closeDialog,
    )
  })

  it.effect(
    'shows an empty result state without selecting a destination',
    () => {
      return scene(
        {
          block: CommandPaletteBlock,
          layer,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        init(),
        openFromShortcut,
        showDialog,
        type(label('Search issues and projects'), 'no matching workspace item'),
        scrollToResult(0),
        expect(text('No matching issues or projects.')).toExist(),
        keydown(label('Search issues and projects'), 'Enter'),
        expectHandled(),
        expect(role('button', { name: 'Close search' })).toExist(),
      )
    },
  )
})
