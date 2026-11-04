import { Array, Option } from 'effect'
import { type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DialogBlock } from '@foldkit/ui/dialog'

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
  ApplicationBlock,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './definition'
import { paletteIndexFromValue } from './model'
import { PALETTE_THEMES } from './palette'
import { requestGridSizeChange, selectColor, selectTool } from './steps'

export const ErrorDialogBinding = ApplicationBlock.makeBinding(DialogBlock, {
  field: 'errorDialog',
  init: { contextToArgs: () => [{ id: 'export-error-dialog' }] },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        maybeExportError: () => Option.none(),
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const GridSizeConfirmDialogBinding = ApplicationBlock.makeBinding(
  DialogBlock,
  {
    field: 'gridSizeConfirmDialog',
    init: { contextToArgs: () => [{ id: 'grid-size-confirm-dialog' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        maybePendingGridSize: () => Option.none(),
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const ToolRadioGroupBinding = ApplicationBlock.makeBinding(
  ToolRadioGroupBlock,
  {
    field: 'toolRadioGroup',
    init: { contextToArgs: () => [{ id: TOOL_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(ToolRadioGroupBlock, {
    Selected: ({ value }) => selectTool(value),
  }),
})

export const GridSizeRadioGroupBinding = ApplicationBlock.makeBinding(
  GridSizeRadioGroupBlock,
  {
    field: 'gridSizeRadioGroup',
    init: { contextToArgs: () => [{ id: GRID_SIZE_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(GridSizeRadioGroupBlock, {
    Selected: ({ value }) => requestGridSizeChange(Number(value)),
  }),
})

export const PaletteRadioGroupBinding = ApplicationBlock.makeBinding(
  PaletteRadioGroupBlock,
  {
    field: 'paletteRadioGroup',
    init: { contextToArgs: () => [{ id: PALETTE_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(PaletteRadioGroupBlock, {
    Selected: ({ value }) =>
      makeStep(model =>
        selectColor(paletteIndexFromValue(value, model.selectedColorIndex))(
          model,
        ),
      ),
  }),
})

const foldThemeListboxOutMessage = ApplicationBlock.makeOutMessageFold(
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

export const ThemeListboxBinding = ApplicationBlock.makeBinding(
  ThemeListboxBlock,
  {
    field: 'themeListbox',
    init: { contextToArgs: () => [{ id: 'theme-picker' }] },
  },
).withOutMessagePolicy({ fold: foldThemeListboxOutMessage })

export const ApplicationComposition = ApplicationBlock.makeComposition({
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
