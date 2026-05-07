import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Array, Effect, Predicate, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { CANVAS_SIZE_PX, EXPORT_SCALE, STORAGE_KEY } from './constant'
import {
  CompletedSaveCanvas,
  FailedExportPng,
  SucceededExportPng,
} from './message'
import type { Model, SavedCanvas } from './model'
import { Grid, PaletteIndex } from './model'
import { SavedCanvasJsonString } from './model'
import { PALETTE_THEMES, resolveColor } from './palette'

export const SaveCanvas = Command.define(
  'SaveCanvas',
  {
    grid: Grid,
    gridSize: S.Number,
    paletteThemeIndex: S.Number,
    selectedColorIndex: PaletteIndex,
  },
  CompletedSaveCanvas,
)(({ grid, gridSize, paletteThemeIndex, selectedColorIndex }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const data: SavedCanvas = {
      grid,
      gridSize,
      paletteThemeIndex,
      selectedColorIndex,
    }
    yield* store.set(STORAGE_KEY, S.encodeSync(SavedCanvasJsonString)(data))
    return CompletedSaveCanvas()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedSaveCanvas())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

export const saveCanvas = (model: Model) =>
  SaveCanvas({
    grid: model.grid,
    gridSize: model.gridSize,
    paletteThemeIndex: model.paletteThemeIndex,
    selectedColorIndex: model.selectedColorIndex,
  })

export const ExportPng = Command.define(
  'ExportPng',
  { grid: Grid, gridSize: S.Number, paletteThemeIndex: S.Number },
  SucceededExportPng,
  FailedExportPng,
)(({ grid, gridSize, paletteThemeIndex }) =>
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
        FailedExportPng({ error: 'Canvas 2D context not available' }),
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

    return SucceededExportPng()
  }).pipe(
    Effect.catchTag('FailedExportPng', error => Effect.succeed(error)),
    Effect.catch(() =>
      Effect.succeed(FailedExportPng({ error: 'Failed to export image' })),
    ),
  ),
)
