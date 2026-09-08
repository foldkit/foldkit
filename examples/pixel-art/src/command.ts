import { Array, Effect, Predicate, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { CANVAS_SIZE_PX, EXPORT_SCALE, STORAGE_KEY } from './constant'
import { Message } from './message'
import type { Model, SavedCanvas } from './model'
import { Grid, PaletteIndex } from './model'
import { SavedCanvasJsonString } from './model'
import { PALETTE_THEMES, resolveColor } from './palette'

export const SaveCanvas = Command.define('SaveCanvas', {
  args: {
    grid: Grid,
    gridSize: Schema.Number,
    paletteThemeIndex: Schema.Number,
    selectedColorIndex: PaletteIndex,
  },
  messages: [Message.CompletedSaveCanvas],
  execute: ({ grid, gridSize, paletteThemeIndex, selectedColorIndex }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const data: SavedCanvas = {
        grid,
        gridSize,
        paletteThemeIndex,
        selectedColorIndex,
      }
      yield* store.set(
        STORAGE_KEY,
        Schema.encodeSync(SavedCanvasJsonString)(data),
      )
      return Message.CompletedSaveCanvas()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSaveCanvas())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const saveCanvas = (model: Model) =>
  SaveCanvas({
    grid: model.grid,
    gridSize: model.gridSize,
    paletteThemeIndex: model.paletteThemeIndex,
    selectedColorIndex: model.selectedColorIndex,
  })

export const ExportPng = Command.define('ExportPng', {
  args: {
    grid: Grid,
    gridSize: Schema.Number,
    paletteThemeIndex: Schema.Number,
  },
  messages: [Message.SucceededExportPng, Message.FailedExportPng],
  execute: ({ grid, gridSize, paletteThemeIndex }) =>
    Effect.gen(function* () {
      const theme = PALETTE_THEMES[paletteThemeIndex] ?? PALETTE_THEMES[0]
      const scale =
        Math.max(1, Math.floor(CANVAS_SIZE_PX / gridSize)) * EXPORT_SCALE
      const canvas = document.createElement('canvas')
      canvas.width = gridSize * scale
      canvas.height = gridSize * scale
      const context = canvas.getContext('2d')

      if (Predicate.isNull(context)) {
        return yield* Effect.fail(
          Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
        )
      }

      Array.forEach(grid, (row, y) => {
        Array.forEach(row, (cell, x) => {
          context.fillStyle = resolveColor(cell, theme)
          context.fillRect(x * scale, y * scale, scale, scale)
        })
      })

      const link = document.createElement('a')
      link.download = 'pixel-art.png'
      link.href = canvas.toDataURL('image/png')
      link.click()

      return Message.SucceededExportPng()
    }).pipe(
      Effect.catchTag('FailedExportPng', error => Effect.succeed(error)),
      Effect.catch(() =>
        Effect.succeed(
          Message.FailedExportPng({ error: 'Failed to export image' }),
        ),
      ),
    ),
})
