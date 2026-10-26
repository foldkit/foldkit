import { Array, Option } from 'effect'
import { type Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DialogBlock } from '@foldkit/ui'

import { saveCanvas } from './command'
import {
  GRID_SIZE_RADIO_GROUP_ID,
  GridSizeRadioGroupBlock,
  PALETTE_RADIO_GROUP_ID,
  PaletteRadioGroupBlock,
  TOOL_RADIO_GROUP_ID,
  ThemeListboxBlock,
  ToolRadioGroupBlock,
} from './components'
import { DEFAULT_COLOR_INDEX } from './constant'
import {
  ApplicationDefinition,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './definition'
import { createEmptyGrid, isGridEmpty } from './grid'
import {
  Model,
  type PaletteIndex,
  type Tool,
  paletteIndexFromValue,
} from './model'
import { PALETTE_THEMES } from './palette'

export const ErrorDialogBinding = ApplicationDefinition.makeBinding(
  DialogBlock,
  {
    field: 'errorDialog',
    init: { contextToArgs: () => [{ id: 'export-error-dialog' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        maybeExportError: () => Option.none(),
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const GridSizeConfirmDialogBinding = ApplicationDefinition.makeBinding(
  DialogBlock,
  {
    field: 'gridSizeConfirmDialog',
    init: { contextToArgs: () => [{ id: 'grid-size-confirm-dialog' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        maybePendingGridSize: () => Option.none(),
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const selectTool = (
  model: typeof Model.Type,
  tool: typeof Tool.Type,
) => ({
  model: modifyFields(model, { tool: () => tool }),
})

export const selectColor = (
  model: typeof Model.Type,
  colorIndex: typeof PaletteIndex.Type,
) => {
  const nextModel = modifyFields(model, {
    selectedColorIndex: () => colorIndex,
  })
  return { model: nextModel, commands: [saveCanvas(nextModel)] }
}

export const ToolRadioGroupBinding = ApplicationDefinition.makeBinding(
  ToolRadioGroupBlock,
  {
    field: 'toolRadioGroup',
    init: { contextToArgs: () => [{ id: TOOL_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ToolRadioGroupBlock, {
    Selected: ({ value }) => makeStep(model => selectTool(model, value)),
  }),
})

export const applyGridSizeChange = (
  model: typeof Model.Type,
  size: number,
) => ({
  model: modifyFields(model, {
    grid: () => createEmptyGrid(size),
    gridSize: () => size,
    undoStack: () => [],
    redoStack: () => [],
    isDrawing: () => false,
    maybeHoveredCell: () => Option.none(),
  }),
})

export const requestGridSizeChangeStep = (size: number) =>
  makeStep(model => {
    if (size === model.gridSize) {
      return { model }
    }

    if (isGridEmpty(model.grid)) {
      return applyGridSizeChange(model, size)
    }

    const rememberGridSizeStep = makeFieldsStep(() => ({
      maybePendingGridSize: () => Option.some(size),
    }))

    return Update.combineSteps([
      rememberGridSizeStep,
      GridSizeConfirmDialogBinding.requestOpen(),
    ])
  })

export const GridSizeRadioGroupBinding = ApplicationDefinition.makeBinding(
  GridSizeRadioGroupBlock,
  {
    field: 'gridSizeRadioGroup',
    init: { contextToArgs: () => [{ id: GRID_SIZE_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(GridSizeRadioGroupBlock, {
    Selected: ({ value }) => requestGridSizeChangeStep(Number(value)),
  }),
})

export const PaletteRadioGroupBinding = ApplicationDefinition.makeBinding(
  PaletteRadioGroupBlock,
  {
    field: 'paletteRadioGroup',
    init: { contextToArgs: () => [{ id: PALETTE_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(PaletteRadioGroupBlock, {
    Selected: ({ value }) =>
      makeStep(model =>
        selectColor(
          model,
          paletteIndexFromValue(value, model.selectedColorIndex),
        ),
      ),
  }),
})

const foldThemeListboxOutMessage = ApplicationDefinition.makeOutMessageFold(
  ThemeListboxBlock,
  {
    Selected: ({ value }) =>
      makeStep(model => {
        const themeIndex = Number(value)
        const maybeNextTheme = Array.get(PALETTE_THEMES, themeIndex)
        if (Option.isNone(maybeNextTheme)) {
          return { model }
        }
        const nextModel = modifyFields(model, {
          paletteThemeIndex: () => themeIndex,
          selectedColorIndex: () => DEFAULT_COLOR_INDEX,
        })
        return { model: nextModel, commands: [saveCanvas(nextModel)] }
      }),
  },
)

export const ThemeListboxBinding = ApplicationDefinition.makeBinding(
  ThemeListboxBlock,
  {
    field: 'themeListbox',
    init: { contextToArgs: () => [{ id: 'theme-picker' }] },
  },
).withOutMessagePolicy({ fold: foldThemeListboxOutMessage })

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [
    ErrorDialogBinding,
    ThemeListboxBinding,
    GridSizeConfirmDialogBinding,
    ToolRadioGroupBinding,
    GridSizeRadioGroupBinding,
    PaletteRadioGroupBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
