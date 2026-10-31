import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Command,
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

import { describe, it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import {
  CommandPalette,
  CommandPaletteLive,
  Message,
  OutMessage,
  ScrollActiveResult,
} from './commandPalette'
import { initialWorkspace } from './domain/seed'

const SceneMessage = defineMessageUnion({ PressedShortcut: {} })

class CommandPaletteScene extends Block<CommandPaletteScene>()(
  'CommandPaletteScene',
  {
    Model: Schema.Struct({ commandPalette: CommandPalette }),
    Message: SceneMessage,
    OutMessage,
  },
) {}

const CommandPaletteSceneLive = CommandPaletteScene.make(
  Effect.fn(function* () {
    const commandPalette = yield* new CommandPalette('commandPalette')

    return {
      model: { commandPalette },
      update: {
        PressedShortcut: model => ({
          model,
          messages: [model.commandPalette.send(Message.PressedOpenShortcut())],
        }),
        ...commandPalette.on({
          SelectedIssue: (model, outMessage) => ({ model, outMessage }),
          SelectedProject: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.OnClick(SceneMessage.PressedShortcut())],
              ['Press shortcut'],
            ),
            model.commandPalette.view({
              issues: initialWorkspace.issues,
              projects: initialWorkspace.projects,
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(CommandPaletteLive))

const openFromShortcut = click(role('button', { name: 'Press shortcut' }))
const showDialog = Command.resolve(
  Dialog.test.ShowDialog,
  Dialog.Dialog.Message.SucceededShowDialog(),
)
const closeDialog = Command.resolve(
  Dialog.test.CloseDialog,
  Dialog.Dialog.Message.CompletedCloseDialog(),
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
        CommandPaletteSceneLive,
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

  it.effect('selects a project from current search inputs', () =>
    scene(
      CommandPaletteSceneLive,
      openFromShortcut,
      showDialog,
      type(label('Search issues and projects'), 'Platform'),
      scrollToResult(0),
      expect(role('option')).toContainText('Platform'),
      click(role('option')),
      expectOutMessage(OutMessage.SelectedProject({ projectId: 'platform' })),
      closeDialog,
    ),
  )

  it.effect('shows an empty result state without selecting a destination', () =>
    scene(
      CommandPaletteSceneLive,
      openFromShortcut,
      showDialog,
      type(label('Search issues and projects'), 'no matching workspace item'),
      scrollToResult(0),
      expect(text('No matching issues or projects.')).toExist(),
      keydown(label('Search issues and projects'), 'Enter'),
      expectHandled(),
      expect(role('button', { name: 'Close search' })).toExist(),
    ),
  )
})
