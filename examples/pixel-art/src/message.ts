import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

import { PaletteIndex, Tool } from './model'

export const Message = defineMessageUnion({
  PressedCell: { x: Schema.Number, y: Schema.Number },
  EnteredCell: { x: Schema.Number, y: Schema.Number },
  LeftCanvas: {},
  ReleasedMouse: {},
  SelectedColor: { colorIndex: PaletteIndex },
  SelectedTool: { tool: Tool },
  SelectedGridSize: { size: Schema.Number },
  ToggledMirrorHorizontal: {},
  ToggledMirrorVertical: {},
  ClickedUndo: {},
  ClickedRedo: {},
  ClickedHistoryStep: { stepIndex: Schema.Number },
  ClickedRedoStep: { stepIndex: Schema.Number },
  ClickedClear: {},
  ClickedExport: {},
  SucceededExportPng: {},
  FailedExportPng: { error: Schema.String },
  GotErrorDialogMessage: { message: Dialog.Message },
  GotThemeListboxMessage: { message: Listbox.Message },
  GotToolRadioGroupMessage: { message: RadioGroup.Message },
  GotGridSizeRadioGroupMessage: { message: RadioGroup.Message },
  GotPaletteRadioGroupMessage: { message: RadioGroup.Message },
  ConfirmedGridSizeChange: {},
  GotGridSizeConfirmDialogMessage: { message: Dialog.Message },
  CompletedSaveCanvas: {},
})

export type Message = typeof Message.Type
