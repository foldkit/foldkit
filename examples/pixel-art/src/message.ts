import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { Dialog, Listbox } from '@foldkit/ui'

import { PaletteIndex, Tool } from './model'

export const PressedCell = m('PressedCell', { x: S.Number, y: S.Number })
export const EnteredCell = m('EnteredCell', { x: S.Number, y: S.Number })
export const LeftCanvas = m('LeftCanvas')
export const ReleasedMouse = m('ReleasedMouse')
export const SelectedColor = m('SelectedColor', {
  colorIndex: PaletteIndex,
})
export const SelectedTool = m('SelectedTool', { tool: Tool })
export const SelectedGridSize = m('SelectedGridSize', {
  size: S.Number,
})
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
export const ClickedExport = m('ClickedExport')
export const SucceededExportPng = m('SucceededExportPng')
export const FailedExportPng = m('FailedExportPng', { error: S.String })
export const GotErrorDialogMessage = m('GotErrorDialogMessage', {
  message: Dialog.Message,
})
export const ConfirmedGridSizeChange = m('ConfirmedGridSizeChange')
export const GotGridSizeConfirmDialogMessage = m(
  'GotGridSizeConfirmDialogMessage',
  { message: Dialog.Message },
)
export const GotThemeListboxMessage = m('GotThemeListboxMessage', {
  message: Listbox.Message,
})
export const CompletedSaveCanvas = m('CompletedSaveCanvas')

export const Message = S.Union([
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
  ClickedExport,
  SucceededExportPng,
  FailedExportPng,
  GotErrorDialogMessage,
  GotThemeListboxMessage,
  ConfirmedGridSizeChange,
  GotGridSizeConfirmDialogMessage,
  CompletedSaveCanvas,
])
export type Message = typeof Message.Type
