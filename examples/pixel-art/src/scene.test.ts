import { Option } from 'effect'
import type { Resolved } from 'foldkit/block'
import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'
import { Dialog, RadioGroup } from '@foldkit/ui'

import { ExportPng, Message, type Model, SaveCanvas } from './application'
import { type PaletteIndex, createEmptyGrid } from './domain/grid'
import { application, startArgs, withInitialModel } from './model.fixture'
import { ToolRadioGroup } from './toolbar'

const resolveFocusOption = Command.resolve(
  RadioGroup.test.FocusOption,
  ToolRadioGroup.Message.CompletedFocusOption(),
)

const paintedModel = (model: Resolved<Model>): Resolved<Model> =>
  modifyFields(model, {
    grid: () =>
      createEmptyGrid(4).map((row, y) =>
        row.map((cell, x) =>
          x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
        ),
      ),
  })

describe('export workflow', () => {
  it.effect('clicking Export PNG produces ExportPng Command', () =>
    scene(
      application,
      startArgs,
      click(role('button', { name: 'Export PNG' })),
      Command.expectExact(ExportPng),
      Command.resolve(ExportPng, Message.SucceededExportPng()),
      Command.expectNone(),
    ),
  )

  it.effect('failed export opens error dialog with message', () =>
    scene(
      application,
      startArgs,
      click(role('button', { name: 'Export PNG' })),
      Command.resolve(
        ExportPng,
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.Dialog.Message.SucceededShowDialog(),
      ),
      expect(text('Export Failed')).toExist(),
      expect(text('Canvas 2D context not available')).toExist(),
      expect(role('button', { name: 'Dismiss' })).toExist(),
    ),
  )

  it.effect('dismissing error dialog closes it', () =>
    scene(
      application,
      startArgs,
      click(role('button', { name: 'Export PNG' })),
      Command.resolve(
        ExportPng,
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.Dialog.Message.SucceededShowDialog(),
      ),
      expect(text('Export Failed')).toExist(),
      click(role('button', { name: 'Dismiss' })),
      Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.Dialog.Message.CompletedCloseDialog(),
      ),
      expect(text('Export Failed')).toBeAbsent(),
    ),
  )
})

describe('header', () => {
  it.effect('renders PixelForge title and Export PNG button', () =>
    scene(
      application,
      startArgs,
      expect(role('heading', { name: 'PixelForge' })).toExist(),
      expect(role('button', { name: 'Export PNG' })).toExist(),
    ),
  )
})

describe('toolbar', () => {
  it.effect('Brush tool is selected by default', () =>
    scene(
      application,
      startArgs,
      expect(role('radio', { name: /^Brush/, checked: true })).toExist(),
      expect(role('radio', { name: /^Fill/, checked: false })).toExist(),
      expect(role('radio', { name: /^Eraser/, checked: false })).toExist(),
    ),
  )

  it.effect('clear canvas button is disabled when canvas is empty', () =>
    scene(
      application,
      startArgs,
      expect(role('button', { name: 'Clear Canvas' })).toBeDisabled(),
    ),
  )

  it.effect('clicking Fill tool selects it', () =>
    scene(
      application,
      startArgs,
      click(role('radio', { name: /^Fill/ })),
      resolveFocusOption,
      expect(role('radio', { name: /^Fill/, checked: true })).toExist(),
      expect(role('radio', { name: /^Brush/, checked: false })).toExist(),
    ),
  )

  it.effect(
    'clear canvas enables after painting then disables after clearing',
    () =>
      withInitialModel(emptyModel =>
        scene(
          application,
          startArgs,
          given(paintedModel(emptyModel)),
          expect(role('button', { name: 'Clear Canvas' })).toBeEnabled(),
          click(role('button', { name: 'Clear Canvas' })),
          Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
          expect(role('button', { name: 'Clear Canvas' })).toBeDisabled(),
        ),
      ),
  )
})

describe('history panel', () => {
  it.effect('undo and redo buttons are disabled with no history', () =>
    scene(
      application,
      startArgs,
      expect(role('button', { name: /^Undo/ })).toBeDisabled(),
      expect(role('button', { name: /^Redo/ })).toBeDisabled(),
    ),
  )

  it.effect('current history entry is visible', () =>
    scene(application, startArgs, expect(text('Current')).toExist()),
  )

  it.effect('undo enables after painting and re-disables after undoing', () =>
    withInitialModel(emptyModel => {
      const modelWithHistory: Resolved<Model> = modifyFields(emptyModel, {
        grid: () =>
          createEmptyGrid(4).map((row, y) =>
            row.map((cell, x) =>
              x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
            ),
          ),
        undoStack: () => [createEmptyGrid(4)],
      })

      return scene(
        application,
        startArgs,
        given(modelWithHistory),
        expect(role('button', { name: /^Undo/ })).toBeEnabled(),
        expect(role('button', { name: /^Redo/ })).toBeDisabled(),
        click(role('button', { name: /^Undo/ })),
        Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        expect(role('button', { name: /^Undo/ })).toBeDisabled(),
        expect(role('button', { name: /^Redo/ })).toBeEnabled(),
      )
    }),
  )
})

describe('grid size change', () => {
  it.effect('painted canvas opens confirmation dialog', () =>
    withInitialModel(emptyModel =>
      scene(
        application,
        startArgs,
        given(paintedModel(emptyModel)),
        click(role('radio', { name: '8' })),
        resolveFocusOption,
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
        expect(text('Change to 8\u00d78?')).toExist(),
        expect(
          text('This will clear your canvas and reset undo history.'),
        ).toExist(),
        expect(role('button', { name: 'Cancel' })).toExist(),
        expect(role('button', { name: 'Clear and Resize' })).toExist(),
      ),
    ),
  )

  it.effect('confirming grid size change closes dialog and saves canvas', () =>
    withInitialModel(emptyModel => {
      const paintedModelWithHistory = modifyFields(paintedModel(emptyModel), {
        undoStack: () => [createEmptyGrid(4)],
      })

      return scene(
        application,
        startArgs,
        given(paintedModelWithHistory),
        click(role('radio', { name: '8' })),
        resolveFocusOption,
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
        expect(text('Change to 8\u00d78?')).toExist(),
        click(role('button', { name: 'Clear and Resize' })),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.Dialog.Message.CompletedCloseDialog(),
        ),
        Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        expect(text('Change to 8\u00d78?')).toBeAbsent(),
      )
    }),
  )

  it.effect('cancelling grid size change keeps current size', () =>
    withInitialModel(emptyModel =>
      scene(
        application,
        startArgs,
        given(paintedModel(emptyModel)),
        click(role('radio', { name: '8' })),
        resolveFocusOption,
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
        expect(text('Change to 8\u00d78?')).toExist(),
        click(role('button', { name: 'Cancel' })),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.Dialog.Message.CompletedCloseDialog(),
        ),
        expect(text('Change to 8\u00d78?')).toBeAbsent(),
      ),
    ),
  )
})
