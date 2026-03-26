import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { PaletteIndex, Tool } from './model'

export const PressedCell = m('PressedCell', { x: S.Number, y: S.Number })
export const EnteredCell = m('EnteredCell', { x: S.Number, y: S.Number })
export const LeftCanvas = m('LeftCanvas')
export const ReleasedMouse = m('ReleasedMouse')
export const SelectedColor = m('SelectedColor', { colorIndex: PaletteIndex })
export const SelectedTool = m('SelectedTool', { tool: Tool })
export const SelectedGridSize = m('SelectedGridSize', { size: S.Number })
export const ToggledMirrorHorizontal = m('ToggledMirrorHorizontal')
export const ToggledMirrorVertical = m('ToggledMirrorVertical')
export const ClickedUndo = m('ClickedUndo')
export const ClickedRedo = m('ClickedRedo')
export const ClickedHistoryStep = m('ClickedHistoryStep', {
  stepIndex: S.Number,
})
export const ClickedRedoStep = m('ClickedRedoStep', {
  stepIndex: S.Number,
})
export const ClickedClear = m('ClickedClear')
export const SelectedPaletteTheme = m('SelectedPaletteTheme', {
  themeIndex: S.Number,
})
export const ClickedExport = m('ClickedExport')
export const SucceededExportPng = m('SucceededExportPng')
export const FailedExportPng = m('FailedExportPng', { error: S.String })
export const DismissedErrorDialog = m('DismissedErrorDialog')
export const GotErrorDialogMessage = m('GotErrorDialogMessage', {
  message: Ui.Dialog.Message,
})
export const ConfirmedGridSizeChange = m('ConfirmedGridSizeChange')
export const DismissedGridSizeConfirmDialog = m(
  'DismissedGridSizeConfirmDialog',
)
export const GotGridSizeConfirmDialogMessage = m(
  'GotGridSizeConfirmDialogMessage',
  { message: Ui.Dialog.Message },
)
export const GotToolRadioGroupMessage = m('GotToolRadioGroupMessage', {
  message: Ui.RadioGroup.Message,
})
export const GotGridSizeRadioGroupMessage = m('GotGridSizeRadioGroupMessage', {
  message: Ui.RadioGroup.Message,
})
export const GotPaletteRadioGroupMessage = m('GotPaletteRadioGroupMessage', {
  message: Ui.RadioGroup.Message,
})
export const GotMirrorHorizontalSwitchMessage = m(
  'GotMirrorHorizontalSwitchMessage',
  { message: Ui.Switch.Message },
)
export const GotMirrorVerticalSwitchMessage = m(
  'GotMirrorVerticalSwitchMessage',
  { message: Ui.Switch.Message },
)
export const GotThemeListboxMessage = m('GotThemeListboxMessage', {
  message: Ui.Listbox.Message,
})
export const CompletedSaveCanvas = m('CompletedSaveCanvas')

export const Message = S.Union(
  PressedCell,
  EnteredCell,
  LeftCanvas,
  ReleasedMouse,
  SelectedColor,
  SelectedTool,
  SelectedGridSize,
  ToggledMirrorHorizontal,
  ToggledMirrorVertical,
  ClickedUndo,
  ClickedRedo,
  ClickedHistoryStep,
  ClickedRedoStep,
  ClickedClear,
  SelectedPaletteTheme,
  ClickedExport,
  SucceededExportPng,
  FailedExportPng,
  DismissedErrorDialog,
  GotErrorDialogMessage,
  GotToolRadioGroupMessage,
  GotGridSizeRadioGroupMessage,
  GotPaletteRadioGroupMessage,
  GotMirrorHorizontalSwitchMessage,
  GotMirrorVerticalSwitchMessage,
  GotThemeListboxMessage,
  ConfirmedGridSizeChange,
  DismissedGridSizeConfirmDialog,
  GotGridSizeConfirmDialogMessage,
  CompletedSaveCanvas,
)
export type Message = typeof Message.Type
