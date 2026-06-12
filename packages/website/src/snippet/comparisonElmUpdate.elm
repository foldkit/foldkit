update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        PressedCell x y ->
            case model.tool of
                Brush ->
                    ( { model
                        | grid = applyBrush x y model
                        , undoStack = Grid.pushHistory model.grid model.undoStack
                        , redoStack = []
                        , isDrawing = True
                      }
                    , Cmd.none
                    )

                Fill ->
                    withSave
                        { model
                            | grid = Grid.floodFill x y model.selectedColorIndex model.grid
                            , undoStack = Grid.pushHistory model.grid model.undoStack
                            , redoStack = []
                        }

                Eraser ->
                    -- ...
        ClickedUndo ->
            case model.undoStack of
                [] ->
                    ( model, Cmd.none )

                previousGrid :: olderGrids ->
                    withSave
                        { model
                            | grid = previousGrid
                            , undoStack = olderGrids
                            , redoStack = model.grid :: model.redoStack
                        }

        -- ... 19 more branches


withSave : Model -> ( Model, Cmd Msg )
withSave model =
    ( model, saveCanvas (encodeSavedCanvas model) )
