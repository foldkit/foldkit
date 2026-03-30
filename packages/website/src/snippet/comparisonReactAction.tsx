type Action =
  | Readonly<{ type: 'PressedCell'; x: number; y: number }>
  | Readonly<{ type: 'EnteredCell'; x: number; y: number }>
  | Readonly<{ type: 'LeftCanvas' }>
  | Readonly<{ type: 'ReleasedMouse' }>
  | Readonly<{ type: 'SelectedColor'; colorIndex: PaletteIndex }>
  | Readonly<{ type: 'SelectedTool'; tool: Tool }>
  | Readonly<{ type: 'SelectedGridSize'; size: number }>
  | Readonly<{ type: 'ToggledMirrorHorizontal' }>
  | Readonly<{ type: 'ToggledMirrorVertical' }>
  | Readonly<{ type: 'ClickedUndo' }>
  | Readonly<{ type: 'ClickedRedo' }>
  | Readonly<{ type: 'ClickedHistoryStep'; stepIndex: number }>
  | Readonly<{ type: 'ClickedRedoStep'; stepIndex: number }>
  | Readonly<{ type: 'ClickedClear' }>
  | Readonly<{ type: 'SelectedPaletteTheme'; themeIndex: number }>
  | Readonly<{ type: 'ExportFailed'; error: string }>
  | Readonly<{ type: 'DismissedErrorDialog' }>
  | Readonly<{ type: 'ConfirmedGridSizeChange' }>
  | Readonly<{ type: 'DismissedGridSizeDialog' }>
