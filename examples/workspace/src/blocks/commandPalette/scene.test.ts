import { Array, Effect, Option } from 'effect'
import {
  Command,
  Subscription,
  click,
  expect,
  expectHandled,
  expectOutMessage,
  keydown,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { describe, test } from 'vitest'

import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { initialWorkspace } from '../../domain'
import { CommandPaletteImplementation, layer } from './block'
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
  test('opens with the keyboard shortcut and selects an issue with Arrow keys and Enter', () => {
    const secondIssue = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))

    return Effect.runPromise(
      scene(
        {
          block: CommandPaletteImplementation,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        Story.init(),
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
      ).pipe(Effect.provide(layer)),
    )
  })

  test('selects a project from current search inputs', () => {
    return Effect.runPromise(
      scene(
        {
          block: CommandPaletteImplementation,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        Story.init(),
        openFromShortcut,
        showDialog,
        type(label('Search issues and projects'), 'Platform'),
        scrollToResult(0),
        expect(role('option')).toContainText('Platform'),
        click(role('option')),
        expectOutMessage(OutMessage.SelectedProject({ projectId: 'platform' })),
        closeDialog,
      ).pipe(Effect.provide(layer)),
    )
  })

  test('shows an empty result state without selecting a destination', () => {
    return Effect.runPromise(
      scene(
        {
          block: CommandPaletteImplementation,
          viewInputs: {
            issues: initialWorkspace.issues,
            projects: initialWorkspace.projects,
          },
        },
        Story.init(),
        openFromShortcut,
        showDialog,
        type(label('Search issues and projects'), 'no matching workspace item'),
        scrollToResult(0),
        expect(text('No matching issues or projects.')).toExist(),
        keydown(label('Search issues and projects'), 'Enter'),
        expectHandled(),
        expect(role('button', { name: 'Close search' })).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
