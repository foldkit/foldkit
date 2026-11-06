import { Array, Option } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { initialWorkspace } from '../../domain'
import { ScrollActiveResult } from './command'
import { CommandPaletteBlock, layer } from './index'
import { Message } from './message'
import { OutMessage } from './outMessage'
import { subscriptions } from './subscription'

const openFromShortcut = Scene.Subscription.emit(
  subscriptions.openShortcut,
  Message.PressedOpenShortcut(),
)
const showDialog = Scene.Command.resolve(
  Dialog.test.ShowDialog,
  Dialog.DialogBlock.Message.SucceededShowDialog(),
)
const closePalette = Scene.Command.resolve(
  Dialog.test.CloseDialog,
  Dialog.DialogBlock.Message.CompletedCloseDialog(),
)
const scrollToResult = (index: number) =>
  Scene.Command.resolve(
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

      return Scene.scene(
        {
          block: CommandPaletteBlock,
          layer,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        Scene.init(),
        openFromShortcut,
        showDialog,
        Scene.type(Scene.label('Search issues and projects'), 'WSP-10'),
        scrollToResult(0),
        Scene.keydown(Scene.label('Search issues and projects'), 'ArrowUp'),
        Scene.expectHandled(),
        scrollToResult(8),
        Scene.expect(Scene.role('option', { selected: true })).toContainText(
          'WSP-109',
        ),
        Scene.keydown(Scene.label('Search issues and projects'), 'ArrowDown'),
        Scene.expectHandled(),
        scrollToResult(0),
        Scene.keydown(Scene.label('Search issues and projects'), 'ArrowDown'),
        Scene.expectHandled(),
        scrollToResult(1),
        Scene.expect(Scene.role('option', { selected: true })).toContainText(
          secondIssue.identifier,
        ),
        Scene.keydown(Scene.label('Search issues and projects'), 'Enter'),
        Scene.expectHandled(),
        Scene.expectOutMessage(
          OutMessage.SelectedIssue({ issueId: secondIssue.id }),
        ),
        closePalette,
        Scene.expect(Scene.label('Search issues and projects')).not.toExist(),
      )
    },
  )

  it.effect('selects a project from current search inputs', () => {
    return Scene.scene(
      {
        block: CommandPaletteBlock,
        layer,
        viewInputs: {
          issues: initialWorkspace.issues,
          projects: initialWorkspace.projects,
        },
      },
      Scene.init(),
      openFromShortcut,
      showDialog,
      Scene.type(Scene.label('Search issues and projects'), 'Platform'),
      scrollToResult(0),
      Scene.expect(Scene.role('option')).toContainText('Platform'),
      Scene.click(Scene.role('option')),
      Scene.expectOutMessage(
        OutMessage.SelectedProject({ projectId: 'platform' }),
      ),
      closePalette,
    )
  })

  it.effect(
    'shows an empty result state without selecting a destination',
    () => {
      return Scene.scene(
        {
          block: CommandPaletteBlock,
          layer,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        Scene.init(),
        openFromShortcut,
        showDialog,
        Scene.type(
          Scene.label('Search issues and projects'),
          'no matching workspace item',
        ),
        scrollToResult(0),
        Scene.expect(Scene.text('No matching issues or projects.')).toExist(),
        Scene.keydown(Scene.label('Search issues and projects'), 'Enter'),
        Scene.expectHandled(),
        Scene.expect(Scene.role('button', { name: 'Close search' })).toExist(),
      )
    },
  )
})
