import { Array, Effect, Layer, Predicate, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'

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
})

const SaveCanvasLive = SaveCanvas.toLayer(
  ({ grid, gridSize, paletteThemeIndex, selectedColorIndex }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const data: SavedCanvas = {
        grid,
        gridSize,
        paletteThemeIndex,
        selectedColorIndex,
      }
      const encodedCanvas = yield* Schema.encodeEffect(SavedCanvasJsonString)(
        data,
      )
      yield* store.set(STORAGE_KEY, encodedCanvas)
      return Message.CompletedSaveCanvas()
    }).pipe(Effect.catch(() => Effect.succeed(Message.CompletedSaveCanvas()))),
)

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
})

const ExportPngLive = ExportPng.toLayer(
  ({ grid, gridSize, paletteThemeIndex }) =>
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
    }).pipe(Effect.catchTag('FailedExportPng', error => Effect.succeed(error))),
})

export const CommandsLive = Layer.mergeAll(SaveCanvasLive, ExportPngLive)
