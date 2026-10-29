import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { saveCanvas } from './command'
import { GridSizeConfirmDialogBinding } from './composition'
import { makeFieldsStep, makeStep } from './definition'
import { createEmptyGrid, isGridEmpty } from './grid'
import { type PaletteIndex, type Tool } from './model'

export const selectToolStep = (tool: Tool) =>
  makeFieldsStep(() => ({ tool: () => tool }))

export const selectColorStep = (colorIndex: PaletteIndex) =>
  makeStep(model => {
    const nextModel = modifyFields(model, {
      selectedColorIndex: () => colorIndex,
    })
    return { model: nextModel, commands: [saveCanvas(nextModel)] }
  })

export const applyGridSizeChangeStep = (size: number) =>
  makeStep(model => ({
    model: modifyFields(model, {
      grid: () => createEmptyGrid(size),
      gridSize: () => size,
      undoStack: () => [],
      redoStack: () => [],
      isDrawing: () => false,
      maybeHoveredCell: () => Option.none(),
    }),
  }))

export const requestGridSizeChangeStep = (size: number) =>
  makeStep(model => {
    if (size === model.gridSize) {
      return { model }
    }

    if (isGridEmpty(model.grid)) {
      return applyGridSizeChangeStep(size)(model)
    }

    const rememberGridSizeStep = makeFieldsStep(() => ({
      maybePendingGridSize: () => Option.some(size),
    }))

    return Update.combineSteps([
      rememberGridSizeStep,
      GridSizeConfirmDialogBinding.requestOpen(),
    ])
  })
