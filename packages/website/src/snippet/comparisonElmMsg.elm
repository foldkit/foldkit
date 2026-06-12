type Msg
    = PressedCell Int Int
    | EnteredCell Int Int
    | LeftCanvas
    | ReleasedMouse
    | SelectedColor Int
    | SelectedTool Tool
    | SelectedGridSize Int
    | ToggledMirrorHorizontal
    | ToggledMirrorVertical
    | ClickedUndo
    | ClickedRedo
    | ClickedHistoryStep Int
    | ClickedRedoStep Int
    | ClickedClear
    | ClickedExport
    | FailedExportPng String
    | DismissedErrorDialog
    | ConfirmedGridSizeChange
    | DismissedGridSizeDialog
    | SelectedPaletteTheme Int
    | ToggledThemePicker
