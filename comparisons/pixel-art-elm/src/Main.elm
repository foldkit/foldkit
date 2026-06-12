port module Main exposing (main)

import Array exposing (Array)
import Browser
import Browser.Events
import Grid exposing (Cell, Grid)
import Html exposing (Html, a, button, div, h1, p, span, text, ul)
import Html.Attributes exposing (attribute, class, classList, disabled, href, id, style, type_)
import Html.Events exposing (onClick, onMouseDown, onMouseEnter, onMouseLeave)
import Html.Keyed
import Html.Lazy exposing (lazy, lazy5)
import Json.Decode as Decode
import Json.Encode as Encode
import Palette exposing (PaletteTheme)
import Svg
import Svg.Attributes



-- CONSTANTS


defaultGridSize : Int
defaultGridSize =
    16


defaultColorIndex : Int
defaultColorIndex =
    0


defaultThemeIndex : Int
defaultThemeIndex =
    0


visibleHistoryCount : Int
visibleHistoryCount =
    6


thumbnailCellSize : Int
thumbnailCellSize =
    2


canvasSizePx : Int
canvasSizePx =
    512


exportScale : Int
exportScale =
    4


gridSizes : List Int
gridSizes =
    [ 8, 16, 24, 32 ]



-- MODEL


type Tool
    = Brush
    | Fill
    | Eraser


type MirrorMode
    = MirrorNone
    | MirrorHorizontal
    | MirrorVertical
    | MirrorBoth


type alias Position =
    { x : Int, y : Int }


type alias SavedCanvas =
    { grid : Grid
    , gridSize : Int
    , paletteThemeIndex : Int
    , selectedColorIndex : Int
    }


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



-- PORTS


port saveCanvas : Encode.Value -> Cmd msg


port requestExportPng : Encode.Value -> Cmd msg


port exportPngFailed : (String -> msg) -> Sub msg



-- INIT


init : Decode.Value -> ( Model, Cmd Msg )
init flags =
    case Decode.decodeValue savedCanvasDecoder flags of
        Ok saved ->
            ( { defaultModel
                | grid = saved.grid
                , gridSize = saved.gridSize
                , paletteThemeIndex = saved.paletteThemeIndex
                , selectedColorIndex = saved.selectedColorIndex
              }
            , Cmd.none
            )

        Err _ ->
            ( defaultModel, Cmd.none )


defaultModel : Model
defaultModel =
    { grid = Grid.createEmpty defaultGridSize
    , undoStack = []
    , redoStack = []
    , selectedColorIndex = defaultColorIndex
    , gridSize = defaultGridSize
    , tool = Brush
    , mirrorMode = MirrorNone
    , isDrawing = False
    , hoveredCell = Nothing
    , exportError = Nothing
    , paletteThemeIndex = defaultThemeIndex
    , pendingGridSize = Nothing
    , isThemePickerOpen = False
    }


savedCanvasDecoder : Decode.Decoder SavedCanvas
savedCanvasDecoder =
    Decode.map4 SavedCanvas
        (Decode.field "grid" gridDecoder)
        (Decode.field "gridSize" Decode.int)
        (Decode.field "paletteThemeIndex" Decode.int)
        (Decode.field "selectedColorIndex" Decode.int)


gridDecoder : Decode.Decoder Grid
gridDecoder =
    Decode.array (Decode.array (Decode.nullable Decode.int))



-- MESSAGE


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



-- UPDATE


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
                    ( { model
                        | grid = applyEraser x y model
                        , undoStack = Grid.pushHistory model.grid model.undoStack
                        , redoStack = []
                        , isDrawing = True
                      }
                    , Cmd.none
                    )

        EnteredCell x y ->
            let
                withHover =
                    { model | hoveredCell = Just { x = x, y = y } }
            in
            if model.isDrawing && model.tool == Brush then
                ( { withHover | grid = applyBrush x y model }, Cmd.none )

            else if model.isDrawing && model.tool == Eraser then
                ( { withHover | grid = applyEraser x y model }, Cmd.none )

            else
                ( withHover, Cmd.none )

        LeftCanvas ->
            ( { model | hoveredCell = Nothing }, Cmd.none )

        ReleasedMouse ->
            if model.isDrawing then
                withSave { model | isDrawing = False }

            else
                ( model, Cmd.none )

        SelectedColor colorIndex ->
            withSave { model | selectedColorIndex = colorIndex }

        SelectedTool tool ->
            ( { model | tool = tool }, Cmd.none )

        SelectedGridSize size ->
            if size == model.gridSize then
                ( model, Cmd.none )

            else if Grid.isEmpty model.grid then
                withSave (applyGridSizeChange size model)

            else
                ( { model | pendingGridSize = Just size }, Cmd.none )

        ToggledMirrorHorizontal ->
            ( { model | mirrorMode = toggleHorizontal model.mirrorMode }, Cmd.none )

        ToggledMirrorVertical ->
            ( { model | mirrorMode = toggleVertical model.mirrorMode }, Cmd.none )

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

        ClickedRedo ->
            case model.redoStack of
                [] ->
                    ( model, Cmd.none )

                nextGrid :: newerGrids ->
                    withSave
                        { model
                            | grid = nextGrid
                            , undoStack = model.grid :: model.undoStack
                            , redoStack = newerGrids
                        }

        ClickedHistoryStep stepIndex ->
            case List.drop stepIndex model.undoStack of
                [] ->
                    ( model, Cmd.none )

                targetGrid :: olderGrids ->
                    withSave
                        { model
                            | grid = targetGrid
                            , undoStack = olderGrids
                            , redoStack =
                                List.reverse (List.take stepIndex model.undoStack)
                                    ++ (model.grid :: model.redoStack)
                        }

        ClickedRedoStep stepIndex ->
            case List.drop stepIndex model.redoStack of
                [] ->
                    ( model, Cmd.none )

                targetGrid :: newerGrids ->
                    withSave
                        { model
                            | grid = targetGrid
                            , undoStack =
                                List.reverse (List.take stepIndex model.redoStack)
                                    ++ (model.grid :: model.undoStack)
                            , redoStack = newerGrids
                        }

        ClickedClear ->
            withSave
                { model
                    | grid = Grid.createEmpty model.gridSize
                    , undoStack = Grid.pushHistory model.grid model.undoStack
                    , redoStack = []
                }

        ClickedExport ->
            ( model, requestExportPng (encodeExportRequest model) )

        FailedExportPng error ->
            ( { model | exportError = Just error }, Cmd.none )

        DismissedErrorDialog ->
            ( { model | exportError = Nothing }, Cmd.none )

        ConfirmedGridSizeChange ->
            case model.pendingGridSize of
                Nothing ->
                    ( model, Cmd.none )

                Just size ->
                    let
                        resized =
                            applyGridSizeChange size model
                    in
                    withSave { resized | pendingGridSize = Nothing }

        DismissedGridSizeDialog ->
            ( { model | pendingGridSize = Nothing }, Cmd.none )

        SelectedPaletteTheme themeIndex ->
            withSave
                { model
                    | paletteThemeIndex = themeIndex
                    , selectedColorIndex = defaultColorIndex
                    , isThemePickerOpen = False
                }

        ToggledThemePicker ->
            ( { model | isThemePickerOpen = not model.isThemePickerOpen }, Cmd.none )


withSave : Model -> ( Model, Cmd Msg )
withSave model =
    ( model, saveCanvas (encodeSavedCanvas model) )


applyBrush : Int -> Int -> Model -> Grid
applyBrush x y model =
    Grid.setPixels
        (Grid.mirroredPositions x y model.gridSize (mirrorFlags model.mirrorMode))
        model.selectedColorIndex
        model.grid


applyEraser : Int -> Int -> Model -> Grid
applyEraser x y model =
    Grid.erasePixels
        (Grid.mirroredPositions x y model.gridSize (mirrorFlags model.mirrorMode))
        model.grid


applyGridSizeChange : Int -> Model -> Model
applyGridSizeChange size model =
    { model
        | grid = Grid.createEmpty size
        , gridSize = size
        , undoStack = []
        , redoStack = []
        , isDrawing = False
        , hoveredCell = Nothing
    }


mirrorFlags : MirrorMode -> { horizontal : Bool, vertical : Bool }
mirrorFlags mirrorMode =
    case mirrorMode of
        MirrorNone ->
            { horizontal = False, vertical = False }

        MirrorHorizontal ->
            { horizontal = True, vertical = False }

        MirrorVertical ->
            { horizontal = False, vertical = True }

        MirrorBoth ->
            { horizontal = True, vertical = True }


toggleHorizontal : MirrorMode -> MirrorMode
toggleHorizontal mirrorMode =
    case mirrorMode of
        MirrorNone ->
            MirrorHorizontal

        MirrorHorizontal ->
            MirrorNone

        MirrorVertical ->
            MirrorBoth

        MirrorBoth ->
            MirrorVertical


toggleVertical : MirrorMode -> MirrorMode
toggleVertical mirrorMode =
    case mirrorMode of
        MirrorNone ->
            MirrorVertical

        MirrorVertical ->
            MirrorNone

        MirrorHorizontal ->
            MirrorBoth

        MirrorBoth ->
            MirrorHorizontal



-- ENCODE


encodeSavedCanvas : Model -> Encode.Value
encodeSavedCanvas model =
    Encode.object
        [ ( "grid", encodeGrid model.grid )
        , ( "gridSize", Encode.int model.gridSize )
        , ( "paletteThemeIndex", Encode.int model.paletteThemeIndex )
        , ( "selectedColorIndex", Encode.int model.selectedColorIndex )
        ]


encodeGrid : Grid -> Encode.Value
encodeGrid grid =
    Encode.array (Encode.array encodeCell) grid


encodeCell : Cell -> Encode.Value
encodeCell cell =
    case cell of
        Nothing ->
            Encode.null

        Just colorIndex ->
            Encode.int colorIndex


encodeExportRequest : Model -> Encode.Value
encodeExportRequest model =
    let
        theme =
            Palette.themeAt model.paletteThemeIndex

        cellSize =
            max 1 (canvasSizePx // model.gridSize) * exportScale
    in
    Encode.object
        [ ( "cellSize", Encode.int cellSize )
        , ( "pixels"
          , Encode.array (Encode.array (Palette.resolveColor theme >> Encode.string)) model.grid
          )
        ]



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Browser.Events.onKeyDown (keyboardDecoder model)
        , if model.isDrawing then
            Browser.Events.onMouseUp (Decode.succeed ReleasedMouse)

          else
            Sub.none
        , exportPngFailed FailedExportPng
        ]


type alias KeyEvent =
    { key : String
    , ctrl : Bool
    , meta : Bool
    , shift : Bool
    , alt : Bool
    }


keyboardDecoder : Model -> Decode.Decoder Msg
keyboardDecoder model =
    Decode.map5 KeyEvent
        (Decode.field "key" Decode.string)
        (Decode.field "ctrlKey" Decode.bool)
        (Decode.field "metaKey" Decode.bool)
        (Decode.field "shiftKey" Decode.bool)
        (Decode.field "altKey" Decode.bool)
        |> Decode.andThen (shortcutFor model)


shortcutFor : Model -> KeyEvent -> Decode.Decoder Msg
shortcutFor model event =
    let
        isModifier =
            event.ctrl || event.meta

        key =
            String.toLower event.key
    in
    if event.key == "Escape" && model.exportError /= Nothing then
        Decode.succeed DismissedErrorDialog

    else if event.key == "Escape" && model.pendingGridSize /= Nothing then
        Decode.succeed DismissedGridSizeDialog

    else if isModifier && event.shift && key == "z" then
        Decode.succeed ClickedRedo

    else if isModifier && key == "z" then
        Decode.succeed ClickedUndo

    else if isModifier && key == "y" then
        Decode.succeed ClickedRedo

    else if isModifier || event.alt then
        Decode.fail "Unhandled key"

    else
        case key of
            "b" ->
                Decode.succeed (SelectedTool Brush)

            "f" ->
                Decode.succeed (SelectedTool Fill)

            "e" ->
                Decode.succeed (SelectedTool Eraser)

            _ ->
                Decode.fail "Unhandled key"



-- VIEW


view : Model -> Html Msg
view model =
    let
        theme =
            Palette.themeAt model.paletteThemeIndex
    in
    div [ class "min-h-screen bg-gray-900 text-gray-100 flex flex-col" ]
        [ headerView
        , div
            [ class "flex-1 grid gap-6 p-4 md:p-6 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-[auto_1fr_auto] md:justify-center md:items-start max-w-5xl mx-auto w-full" ]
            [ toolbarView model theme
            , canvasView model theme
            , historyView model theme
            ]
        , errorDialogView model.exportError
        , confirmDialogView model.pendingGridSize
        ]


headerView : Html Msg
headerView =
    div [ class "flex items-center justify-between px-4 py-3 border-b border-gray-800" ]
        [ div [ class "flex flex-col" ]
            [ h1 [ class "text-lg font-bold tracking-tight leading-none mb-1" ] [ text "PixelForge" ]
            , div [ class "flex items-center gap-1 text-xs text-gray-400 leading-none" ]
                [ span [] [ text "Built with Elm" ]
                , span [] [ text "/" ]
                , a
                    [ href "https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm"
                    , class "hover:text-gray-200 transition"
                    ]
                    [ text "Source on GitHub" ]
                ]
            ]
        , div [ class "flex items-center gap-4" ]
            [ button
                [ type_ "button"
                , onClick ClickedExport
                , class "px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none flex items-center gap-2 hover:bg-gray-700 cursor-pointer"
                ]
                [ downloadIcon
                , span [] [ text "Export PNG" ]
                ]
            ]
        ]



-- VIEW: TOOLBAR


sectionLabel : String -> Html Msg
sectionLabel label =
    div [ class "text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2" ]
        [ text label ]


toolbarView : Model -> PaletteTheme -> Html Msg
toolbarView model theme =
    div [ class "w-full md:w-44 flex flex-col gap-5 flex-shrink-0" ]
        [ lazy toolSection model.tool
        , lazy mirrorSection model.mirrorMode
        , lazy sizeSection model.gridSize
        , paletteSection model theme
        , lazy clearCanvasSection model.grid
        ]


toolSection : Tool -> Html Msg
toolSection selectedTool =
    div []
        [ sectionLabel "Tools"
        , div
            [ attribute "role" "radiogroup"
            , attribute "aria-label" "Drawing tool"
            , class "flex flex-col gap-1.5"
            ]
            (List.map (toolButton selectedTool) [ Brush, Fill, Eraser ])
        ]


toolButton : Tool -> Tool -> Html Msg
toolButton selectedTool tool =
    let
        isSelected =
            tool == selectedTool
    in
    button
        [ type_ "button"
        , attribute "role" "radio"
        , attribute "aria-checked" (boolToAttribute isSelected)
        , onClick (SelectedTool tool)
        , class "flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none w-full cursor-pointer"
        , classList
            [ ( "bg-indigo-600 text-white", isSelected )
            , ( "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200", not isSelected )
            ]
        ]
        [ span [] [ text (toolName tool) ]
        , span [ class "text-xs text-gray-400" ] [ text (toolShortcut tool) ]
        ]


toolName : Tool -> String
toolName tool =
    case tool of
        Brush ->
            "Brush"

        Fill ->
            "Fill"

        Eraser ->
            "Eraser"


toolShortcut : Tool -> String
toolShortcut tool =
    case tool of
        Brush ->
            "B"

        Fill ->
            "F"

        Eraser ->
            "E"


mirrorSection : MirrorMode -> Html Msg
mirrorSection mirrorMode =
    let
        mirror =
            mirrorFlags mirrorMode
    in
    div []
        [ sectionLabel "Mirror"
        , div [ class "flex gap-2" ]
            [ div [ class "flex-1" ]
                [ mirrorSwitch "H" mirror.horizontal ToggledMirrorHorizontal ]
            , div [ class "flex-1" ]
                [ mirrorSwitch "V" mirror.vertical ToggledMirrorVertical ]
            ]
        ]


mirrorSwitch : String -> Bool -> Msg -> Html Msg
mirrorSwitch label isChecked msg =
    button
        [ type_ "button"
        , attribute "role" "switch"
        , attribute "aria-checked" (boolToAttribute isChecked)
        , onClick msg
        , class "w-full px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer"
        , classList
            [ ( "bg-indigo-600 text-white", isChecked )
            , ( "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200", not isChecked )
            ]
        ]
        [ text label ]


sizeSection : Int -> Html Msg
sizeSection gridSize =
    div []
        [ sectionLabel "Grid Size"
        , div
            [ attribute "role" "radiogroup"
            , attribute "aria-label" "Grid size"
            , class "flex gap-1"
            ]
            (List.map (sizeButton gridSize) gridSizes)
        ]


sizeButton : Int -> Int -> Html Msg
sizeButton selectedSize size =
    let
        isSelected =
            size == selectedSize
    in
    button
        [ type_ "button"
        , attribute "role" "radio"
        , attribute "aria-checked" (boolToAttribute isSelected)
        , onClick (SelectedGridSize size)
        , class "flex-1 px-2 py-1.5 rounded text-sm transition motion-reduce:transition-none cursor-pointer"
        , classList
            [ ( "bg-indigo-600 text-white", isSelected )
            , ( "bg-gray-800 text-gray-400 hover:text-gray-200", not isSelected )
            ]
        ]
        [ text (String.fromInt size) ]


paletteSection : Model -> PaletteTheme -> Html Msg
paletteSection model theme =
    let
        selectedHexColor =
            Palette.resolveColor theme (Just model.selectedColorIndex)
    in
    div []
        [ sectionLabel "Color"
        , div [ class "text-xs text-gray-400 font-mono pb-3" ] [ text selectedHexColor ]
        , div
            [ attribute "role" "radiogroup"
            , attribute "aria-label" "Color palette"
            , class "grid grid-cols-4 gap-2.5"
            ]
            (List.indexedMap (swatchButton model.selectedColorIndex) theme.colors)
        , themePicker model.isThemePickerOpen model.paletteThemeIndex theme
        ]


swatchButton : Int -> Int -> String -> Html Msg
swatchButton selectedColorIndex colorIndex hexColor =
    let
        isSelected =
            colorIndex == selectedColorIndex
    in
    button
        [ type_ "button"
        , attribute "role" "radio"
        , attribute "aria-checked" (boolToAttribute isSelected)
        , onClick (SelectedColor colorIndex)
        , class "w-full aspect-square rounded-sm transition motion-reduce:transition-none cursor-pointer"
        , classList
            [ ( "ring-2 ring-white ring-offset-2 ring-offset-gray-900", isSelected )
            , ( "hover:scale-105 motion-reduce:hover:scale-100", not isSelected )
            ]
        , style "background-color" hexColor
        ]
        [ span [ class "sr-only" ] [ text hexColor ] ]


themePicker : Bool -> Int -> PaletteTheme -> Html Msg
themePicker isOpen selectedThemeIndex theme =
    div [ class "relative w-full mt-3" ]
        [ button
            [ type_ "button"
            , onClick ToggledThemePicker
            , attribute "aria-haspopup" "listbox"
            , attribute "aria-expanded" (boolToAttribute isOpen)
            , class "w-full px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition motion-reduce:transition-none"
            ]
            [ div [ class "flex items-center justify-between w-full" ]
                [ span [] [ text theme.name ]
                , chevronDownIcon
                ]
            ]
        , if isOpen then
            div []
                [ div [ class "fixed inset-0 z-10", onClick ToggledThemePicker ] []
                , ul
                    [ attribute "role" "listbox"
                    , attribute "aria-label" "Palette theme"
                    , class "absolute left-0 right-0 top-full mt-1 rounded-lg border border-gray-700 bg-gray-800 shadow-lg overflow-hidden z-20"
                    ]
                    (List.indexedMap (themeOption selectedThemeIndex) Palette.themes)
                ]

          else
            text ""
        ]


themeOption : Int -> Int -> PaletteTheme -> Html Msg
themeOption selectedThemeIndex themeIndex theme =
    let
        isSelected =
            themeIndex == selectedThemeIndex
    in
    Html.li
        [ attribute "role" "option"
        , attribute "aria-selected" (boolToAttribute isSelected)
        ]
        [ button
            [ type_ "button"
            , onClick (SelectedPaletteTheme themeIndex)
            , class "w-full px-3 py-2 text-sm cursor-pointer transition motion-reduce:transition-none text-left"
            , classList
                [ ( "bg-indigo-600 text-white", isSelected )
                , ( "text-gray-300 hover:bg-gray-700", not isSelected )
                ]
            ]
            [ div [ class "flex items-center justify-between" ]
                [ span [] [ text theme.name ]
                , if isSelected then
                    span [ class "text-xs" ] [ text "✓" ]

                  else
                    text ""
                ]
            ]
        ]


clearCanvasSection : Grid -> Html Msg
clearCanvasSection grid =
    let
        isEmpty =
            Grid.isEmpty grid
    in
    button
        [ type_ "button"
        , onClick ClickedClear
        , disabled isEmpty
        , class "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none"
        , classList
            [ ( "opacity-40 cursor-not-allowed", isEmpty )
            , ( "hover:bg-gray-700 cursor-pointer", not isEmpty )
            ]
        ]
        [ trashIcon
        , span [] [ text "Clear Canvas" ]
        ]



-- VIEW: CANVAS


canvasView : Model -> PaletteTheme -> Html Msg
canvasView model theme =
    let
        previewPositions =
            computePreviewPositions model

        previewColor =
            case model.tool of
                Eraser ->
                    Palette.emptyColor

                _ ->
                    Palette.resolveColor theme (Just model.selectedColorIndex)
    in
    div [ class "flex flex-col items-center gap-4 min-w-0 self-start col-span-full min-[480px]:col-span-full md:col-span-1 -order-1 md:order-none" ]
        [ div [ class "w-full max-w-lg", onMouseLeave LeftCanvas ]
            [ Html.Keyed.node "div"
                [ class "cursor-crosshair select-none w-full aspect-square flex flex-col bg-white" ]
                (Grid.toRows model.grid
                    |> List.map
                        (\( y, row ) ->
                            ( String.fromInt y
                            , lazy5 rowView
                                y
                                row
                                previewColor
                                (rowPreviewPositions y previewPositions)
                                theme.colors
                            )
                        )
                )
            ]
        ]


rowPreviewPositions : Int -> List ( Int, Int ) -> List Int
rowPreviewPositions y previewPositions =
    previewPositions
        |> List.filterMap
            (\( previewX, previewY ) ->
                if previewY == y then
                    Just previewX

                else
                    Nothing
            )


computePreviewPositions : Model -> List ( Int, Int )
computePreviewPositions model =
    case ( model.isDrawing, model.hoveredCell ) of
        ( True, _ ) ->
            []

        ( False, Nothing ) ->
            []

        ( False, Just { x, y } ) ->
            case model.tool of
                Fill ->
                    Grid.fillPreviewPositions x y model.selectedColorIndex model.grid

                _ ->
                    Grid.mirroredPositions x y model.gridSize (mirrorFlags model.mirrorMode)


rowView : Int -> Array Cell -> String -> List Int -> List String -> Html Msg
rowView y row previewColor previewColumns paletteColors =
    div [ class "flex flex-1" ]
        (Array.toIndexedList row
            |> List.map
                (\( x, cell ) ->
                    let
                        isPreview =
                            List.member x previewColumns

                        baseColor =
                            cellColor paletteColors cell

                        displayColor =
                            if isPreview then
                                previewColor

                            else
                                baseColor
                    in
                    cellView x y displayColor
                )
        )


cellColor : List String -> Cell -> String
cellColor paletteColors cell =
    case cell of
        Nothing ->
            Palette.emptyColor

        Just colorIndex ->
            paletteColors
                |> List.drop colorIndex
                |> List.head
                |> Maybe.withDefault Palette.emptyColor


cellView : Int -> Int -> String -> Html Msg
cellView x y backgroundColor =
    div
        [ onMouseDown (PressedCell x y)
        , onMouseEnter (EnteredCell x y)
        , style "flex" "1"
        , style "background-color" backgroundColor
        ]
        []



-- VIEW: HISTORY


historyView : Model -> PaletteTheme -> Html Msg
historyView model theme =
    let
        undoCount =
            List.length model.undoStack

        redoCount =
            List.length model.redoStack

        visibleUndoEntries =
            List.take visibleHistoryCount model.undoStack

        hiddenUndoCount =
            undoCount - List.length visibleUndoEntries

        currentGrid =
            if model.isDrawing then
                model.undoStack
                    |> List.head
                    |> Maybe.withDefault model.grid

            else
                model.grid

        redoEntries =
            model.redoStack
                |> List.indexedMap
                    (\stepIndex entryGrid ->
                        thumbnailButton entryGrid
                            theme
                            ("Forward " ++ String.fromInt (stepIndex + 1))
                            (ClickedRedoStep stepIndex)
                    )
                |> List.reverse

        undoEntries =
            visibleUndoEntries
                |> List.indexedMap
                    (\stepIndex entryGrid ->
                        thumbnailButton entryGrid
                            theme
                            ("Back " ++ String.fromInt (stepIndex + 1))
                            (ClickedHistoryStep stepIndex)
                    )
    in
    div [ class "w-full md:w-44 flex flex-col flex-shrink-0" ]
        [ sectionLabel "History"
        , div [ class "flex flex-col gap-1.5" ]
            [ historyButton "Undo" "⌘Z" (undoCount > 0) ClickedUndo
            , historyButton "Redo" "⌘⇧Z" (redoCount > 0) ClickedRedo
            ]
        , div [ class "flex flex-col gap-1.5 overflow-y-auto max-h-[420px] mt-3" ]
            (redoEntries
                ++ (currentThumbnail currentGrid theme
                        :: undoEntries
                   )
                ++ (if hiddenUndoCount > 0 then
                        [ div [ class "text-[10px] text-gray-500 text-center py-1" ]
                            [ text (String.fromInt hiddenUndoCount ++ " more…") ]
                        ]

                    else
                        []
                   )
            )
        ]


historyButton : String -> String -> Bool -> Msg -> Html Msg
historyButton label shortcut isEnabled msg =
    button
        [ type_ "button"
        , onClick msg
        , disabled (not isEnabled)
        , class "flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-gray-800 w-full"
        , classList
            [ ( "text-gray-200 hover:bg-gray-700 cursor-pointer", isEnabled )
            , ( "text-gray-600 opacity-40 cursor-not-allowed", not isEnabled )
            ]
        ]
        [ span [] [ text label ]
        , span [ class "text-gray-400" ] [ text shortcut ]
        ]


currentThumbnail : Grid -> PaletteTheme -> Html Msg
currentThumbnail grid theme =
    div [ class "flex items-center gap-2 px-2 py-1.5 rounded bg-indigo-600 text-white" ]
        [ thumbnailGrid grid theme
        , span [ class "text-[10px] truncate text-white" ] [ text "Current" ]
        ]


thumbnailButton : Grid -> PaletteTheme -> String -> Msg -> Html Msg
thumbnailButton grid theme label msg =
    button
        [ type_ "button"
        , onClick msg
        , class "flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800 cursor-pointer hover:bg-gray-700 text-left w-full"
        ]
        [ thumbnailGrid grid theme
        , span [ class "text-[10px] truncate text-gray-400" ] [ text label ]
        ]


thumbnailGrid : Grid -> PaletteTheme -> Html Msg
thumbnailGrid grid theme =
    let
        gridSize =
            Array.length grid

        cellSizePx =
            String.fromInt thumbnailCellSize ++ "px"
    in
    div
        [ class "flex-shrink-0"
        , style "display" "grid"
        , style "grid-template-columns"
            ("repeat(" ++ String.fromInt gridSize ++ ", " ++ cellSizePx ++ ")")
        ]
        (Grid.toRows grid
            |> List.concatMap
                (\( _, row ) ->
                    Array.toList row
                        |> List.map
                            (\cell ->
                                div
                                    [ style "width" cellSizePx
                                    , style "height" cellSizePx
                                    , style "background-color" (Palette.resolveColor theme cell)
                                    ]
                                    []
                            )
                )
        )



-- VIEW: DIALOGS


errorDialogView : Maybe String -> Html Msg
errorDialogView exportError =
    case exportError of
        Nothing ->
            text ""

        Just error ->
            dialogShell DismissedErrorDialog
                "export-error-title"
                [ p
                    [ id "export-error-title"
                    , class "text-lg font-semibold text-red-400 mb-2"
                    ]
                    [ text "Export Failed" ]
                , p [ class "text-sm text-gray-400 mb-4" ] [ text error ]
                , button
                    [ type_ "button"
                    , onClick DismissedErrorDialog
                    , class "w-full px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer"
                    ]
                    [ text "Dismiss" ]
                ]


confirmDialogView : Maybe Int -> Html Msg
confirmDialogView pendingGridSize =
    case pendingGridSize of
        Nothing ->
            text ""

        Just size ->
            dialogShell DismissedGridSizeDialog
                "grid-size-confirm-title"
                [ p
                    [ id "grid-size-confirm-title"
                    , class "text-lg font-semibold text-gray-100 mb-2"
                    ]
                    [ text ("Change to " ++ String.fromInt size ++ "×" ++ String.fromInt size ++ "?") ]
                , p [ class "text-sm text-gray-400 mb-5" ]
                    [ text "This will clear your canvas and reset undo history." ]
                , div [ class "flex gap-3" ]
                    [ button
                        [ type_ "button"
                        , onClick DismissedGridSizeDialog
                        , class "flex-1 px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer"
                        ]
                        [ text "Cancel" ]
                    , button
                        [ type_ "button"
                        , onClick ConfirmedGridSizeChange
                        , class "flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition motion-reduce:transition-none cursor-pointer"
                        ]
                        [ text "Clear and Resize" ]
                    ]
                ]


dialogShell : Msg -> String -> List (Html Msg) -> Html Msg
dialogShell dismissMsg titleId panelContent =
    div [ class "relative z-50" ]
        [ div
            [ class "fixed inset-0 bg-black/60"
            , attribute "aria-hidden" "true"
            , onClick dismissMsg
            ]
            []
        , div [ class "fixed inset-0 flex items-center justify-center p-4 pointer-events-none" ]
            [ div
                [ attribute "role" "dialog"
                , attribute "aria-modal" "true"
                , attribute "aria-labelledby" titleId
                , class "bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl pointer-events-auto"
                ]
                panelContent
            ]
        ]



-- VIEW: ICONS


downloadIcon : Html Msg
downloadIcon =
    Svg.svg
        [ Svg.Attributes.class "w-4 h-4"
        , attribute "aria-hidden" "true"
        , Svg.Attributes.fill "none"
        , Svg.Attributes.viewBox "0 0 24 24"
        , Svg.Attributes.strokeWidth "1.5"
        , Svg.Attributes.stroke "currentColor"
        ]
        [ Svg.path
            [ Svg.Attributes.strokeLinecap "round"
            , Svg.Attributes.strokeLinejoin "round"
            , Svg.Attributes.d "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            ]
            []
        ]


trashIcon : Html Msg
trashIcon =
    Svg.svg
        [ Svg.Attributes.class "w-4 h-4"
        , attribute "aria-hidden" "true"
        , Svg.Attributes.fill "none"
        , Svg.Attributes.viewBox "0 0 24 24"
        , Svg.Attributes.strokeWidth "1.5"
        , Svg.Attributes.stroke "currentColor"
        ]
        [ Svg.path
            [ Svg.Attributes.strokeLinecap "round"
            , Svg.Attributes.strokeLinejoin "round"
            , Svg.Attributes.d "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            ]
            []
        ]


chevronDownIcon : Html Msg
chevronDownIcon =
    Svg.svg
        [ Svg.Attributes.class "w-4 h-4 text-gray-400"
        , attribute "aria-hidden" "true"
        , Svg.Attributes.fill "none"
        , Svg.Attributes.viewBox "0 0 24 24"
        , Svg.Attributes.strokeWidth "1.5"
        , Svg.Attributes.stroke "currentColor"
        ]
        [ Svg.path
            [ Svg.Attributes.strokeLinecap "round"
            , Svg.Attributes.strokeLinejoin "round"
            , Svg.Attributes.d "M19.5 8.25l-7.5 7.5-7.5-7.5"
            ]
            []
        ]



-- HELPERS


boolToAttribute : Bool -> String
boolToAttribute isTrue =
    if isTrue then
        "true"

    else
        "false"



-- MAIN


main : Program Decode.Value Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }
