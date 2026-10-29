import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

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
  ConfirmedGridSizeChange: {},
  CompletedSaveCanvas: {},
})
export type Message = typeof Message.Type
export type ClickedUndo = typeof Message.ClickedUndo.Type
export type ClickedRedo = typeof Message.ClickedRedo.Type
export type SelectedTool = typeof Message.SelectedTool.Type
