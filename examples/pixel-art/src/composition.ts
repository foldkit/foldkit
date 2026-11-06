import { Array, Option } from 'effect'
import { type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} from './block'
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
import { paletteIndexFromValue } from './model'
import { PALETTE_THEMES } from './palette'
import { changeGridSize, selectColor, selectTool } from './steps'

export const ErrorDialogBinding = makeBinding(Dialog.DialogBlock, {
  field: 'errorDialog',
  init: { contextToArgs: () => [{ id: 'export-error-dialog' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        maybeExportError: () => Option.none(),
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const GridSizeConfirmDialogBinding = makeBinding(Dialog.DialogBlock, {
  field: 'gridSizeConfirmDialog',
  init: { contextToArgs: () => [{ id: 'grid-size-confirm-dialog' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        maybePendingGridSize: () => Option.none(),
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const ToolRadioGroupBinding = makeBinding(ToolRadioGroupBlock, {
  field: 'toolRadioGroup',
  init: { contextToArgs: () => [{ id: TOOL_RADIO_GROUP_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ToolRadioGroupBlock, {
    Selected: ({ value }) => selectTool(value),
  }),
})

export const GridSizeRadioGroupBinding = makeBinding(GridSizeRadioGroupBlock, {
  field: 'gridSizeRadioGroup',
  init: { contextToArgs: () => [{ id: GRID_SIZE_RADIO_GROUP_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(GridSizeRadioGroupBlock, {
    Selected: ({ value }) => changeGridSize(Number(value)),
  }),
})

export const PaletteRadioGroupBinding = makeBinding(PaletteRadioGroupBlock, {
  field: 'paletteRadioGroup',
  init: { contextToArgs: () => [{ id: PALETTE_RADIO_GROUP_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PaletteRadioGroupBlock, {
    Selected: ({ value }) =>
      makeStep(model =>
        selectColor(paletteIndexFromValue(value, model.selectedColorIndex))(
          model,
        ),
      ),
  }),
})

const foldThemeListboxOutMessage = makeOutMessageFold(ThemeListboxBlock, {
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
})

export const ThemeListboxBinding = makeBinding(ThemeListboxBlock, {
  field: 'themeListbox',
  init: { contextToArgs: () => [{ id: 'theme-picker' }] },
}).withOutMessagePolicy({ fold: foldThemeListboxOutMessage })

export const ApplicationComposition = makeComposition({
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
