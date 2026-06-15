const PressedCell = m('PressedCell', { x: S.Number, y: S.Number })
const EnteredCell = m('EnteredCell', { x: S.Number, y: S.Number })
const LeftCanvas = m('LeftCanvas')
const ReleasedMouse = m('ReleasedMouse')
const SelectedColor = m('SelectedColor', { colorIndex: PaletteIndex })
const SelectedTool = m('SelectedTool', { tool: Tool })
const SelectedGridSize = m('SelectedGridSize', { size: S.Number })
const ToggledMirrorHorizontal = m('ToggledMirrorHorizontal')
const ToggledMirrorVertical = m('ToggledMirrorVertical')
const ClickedUndo = m('ClickedUndo')
const ClickedRedo = m('ClickedRedo')
const ClickedHistoryStep = m('ClickedHistoryStep', { stepIndex: S.Number })
const ClickedRedoStep = m('ClickedRedoStep', { stepIndex: S.Number })
const ClickedClear = m('ClickedClear')
const ClickedExport = m('ClickedExport')
const SucceededExportPng = m('SucceededExportPng')
const FailedExportPng = m('FailedExportPng', { error: S.String })
const GotErrorDialogMessage = m('GotErrorDialogMessage', {
  message: Dialog.Message,
})
const ConfirmedGridSizeChange = m('ConfirmedGridSizeChange')
const GotGridSizeConfirmDialogMessage = m('GotGridSizeConfirmDialogMessage', {
  message: Dialog.Message,
})
const GotToolRadioGroupMessage = m('GotToolRadioGroupMessage', {
  message: RadioGroup.Message,
})
const GotGridSizeRadioGroupMessage = m('GotGridSizeRadioGroupMessage', {
  message: RadioGroup.Message,
})
const GotPaletteRadioGroupMessage = m('GotPaletteRadioGroupMessage', {
  message: RadioGroup.Message,
})
const GotMirrorHorizontalSwitchMessage = m('GotMirrorHorizontalSwitchMessage', {
  message: Switch.Message,
})
const GotMirrorVerticalSwitchMessage = m('GotMirrorVerticalSwitchMessage', {
  message: Switch.Message,
})
const GotThemeListboxMessage = m('GotThemeListboxMessage', {
  message: Listbox.Message,
})
const CompletedSaveCanvas = m('CompletedSaveCanvas')

const Message = S.Union([
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
  ConfirmedGridSizeChange,
  GotGridSizeConfirmDialogMessage,
  GotToolRadioGroupMessage,
  GotGridSizeRadioGroupMessage,
  GotPaletteRadioGroupMessage,
  GotMirrorHorizontalSwitchMessage,
  GotMirrorVerticalSwitchMessage,
  GotThemeListboxMessage,
  CompletedSaveCanvas,
])
type Message = typeof Message.Type
