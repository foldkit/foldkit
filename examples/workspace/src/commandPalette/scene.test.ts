import { Array, Option } from 'effect'
import { Scene } from 'foldkit'
import {
  Command,
  Subscription,
  click,
  expect,
  expectHandled,
  expectOutMessage,
  given,
  keydown,
  label,
  role,
  scene,
  text,
  type,
  withViewInputs,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Dialog, DialogBlock } from '@foldkit/ui'

import { initialWorkspace } from '../domain'
import { CommandPaletteBlock } from './block'
import { ScrollActiveResult } from './command'
import { CommandPaletteComposition } from './composition'
import { Message } from './message'
import { OutMessage } from './outMessage'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const sceneView = withViewInputs(view, {
  issues: initialWorkspace.issues,
  projects: initialWorkspace.projects,
})
const sceneSubscriptions = Scene.subscriptions(
  CommandPaletteComposition,
  subscriptions,
)
const openFromShortcut = Subscription.emit(
  subscriptions.openShortcut,
  Message.PressedOpenShortcut(),
)
const showDialog = Command.resolve(
  Dialog.test.ShowDialog,
  DialogBlock.Message.SucceededShowDialog(),
)
const closeDialog = Command.resolve(
  Dialog.test.CloseDialog,
  DialogBlock.Message.CompletedCloseDialog(),
)
const scrollToResult = (index: number) =>
  Command.resolve(
    ScrollActiveResult({ index }),
    Message.CompletedScrollActiveResult(),
  )

describe('command palette search', () => {
  test('opens with the keyboard shortcut and selects an issue with Arrow keys and Enter', () => {
    const secondIssue = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))

    scene(
      { update, view: sceneView(), subscriptions: sceneSubscriptions },
      given(CommandPaletteBlock.init().model),
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
  })

  test('selects a project from current search inputs', () => {
    scene(
      { update, view: sceneView(), subscriptions: sceneSubscriptions },
      given(CommandPaletteBlock.init().model),
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

  test('shows an empty result state without selecting a destination', () => {
    scene(
      { update, view: sceneView(), subscriptions: sceneSubscriptions },
      given(CommandPaletteBlock.init().model),
      openFromShortcut,
      showDialog,
      type(label('Search issues and projects'), 'no matching workspace item'),
      scrollToResult(0),
      expect(text('No matching issues or projects.')).toExist(),
      keydown(label('Search issues and projects'), 'Enter'),
      expectHandled(),
      expect(role('button', { name: 'Close search' })).toExist(),
    )
  })
})
