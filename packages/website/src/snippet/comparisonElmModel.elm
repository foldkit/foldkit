type Tool
    = Brush
    | Fill
    | Eraser


type MirrorMode
    = MirrorNone
    | MirrorHorizontal
    | MirrorVertical
    | MirrorBoth


type alias Model =
    { grid : Grid
    , undoStack : List Grid
    , redoStack : List Grid
    , selectedColorIndex : Int
    , gridSize : Int
    , tool : Tool
    , mirrorMode : MirrorMode
    , isDrawing : Bool
    , hoveredCell : Maybe Position
    , exportError : Maybe String
    , paletteThemeIndex : Int
    , pendingGridSize : Maybe Int
    , isThemePickerOpen : Bool
    }
