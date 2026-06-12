module Grid exposing
    ( Cell
    , Grid
    , cellAt
    , createEmpty
    , erasePixels
    , fillPreviewPositions
    , floodFill
    , isEmpty
    , mirroredPositions
    , pushHistory
    , setPixels
    , toRows
    )

import Array exposing (Array)


type alias Cell =
    Maybe Int


type alias Grid =
    Array (Array Cell)


maxHistory : Int
maxHistory =
    50


createEmpty : Int -> Grid
createEmpty size =
    Array.repeat size (Array.repeat size Nothing)


toRows : Grid -> List ( Int, Array Cell )
toRows grid =
    Array.toIndexedList grid


isEmpty : Grid -> Bool
isEmpty grid =
    grid
        |> Array.toList
        |> List.all (\row -> List.all ((==) Nothing) (Array.toList row))


cellAt : Int -> Int -> Grid -> Cell
cellAt x y grid =
    Array.get y grid
        |> Maybe.andThen (Array.get x)
        |> Maybe.withDefault Nothing


setCell : Int -> Int -> Cell -> Grid -> Grid
setCell x y cell grid =
    case Array.get y grid of
        Nothing ->
            grid

        Just row ->
            Array.set y (Array.set x cell row) grid


setPixels : List ( Int, Int ) -> Int -> Grid -> Grid
setPixels positions colorIndex grid =
    List.foldl
        (\( x, y ) currentGrid -> setCell x y (Just colorIndex) currentGrid)
        grid
        positions


erasePixels : List ( Int, Int ) -> Grid -> Grid
erasePixels positions grid =
    List.foldl
        (\( x, y ) currentGrid -> setCell x y Nothing currentGrid)
        grid
        positions


mirroredPositions : Int -> Int -> Int -> { horizontal : Bool, vertical : Bool } -> List ( Int, Int )
mirroredPositions x y gridSize mirror =
    let
        mirrorX =
            gridSize - 1 - x

        mirrorY =
            gridSize - 1 - y
    in
    case ( mirror.horizontal, mirror.vertical ) of
        ( True, True ) ->
            [ ( x, y ), ( mirrorX, y ), ( x, mirrorY ), ( mirrorX, mirrorY ) ]

        ( True, False ) ->
            [ ( x, y ), ( mirrorX, y ) ]

        ( False, True ) ->
            [ ( x, y ), ( x, mirrorY ) ]

        ( False, False ) ->
            [ ( x, y ) ]


floodFill : Int -> Int -> Int -> Grid -> Grid
floodFill startX startY fillColorIndex grid =
    let
        target =
            cellAt startX startY grid
    in
    if target == Just fillColorIndex then
        grid

    else
        fillLoop (Array.length grid) target (Just fillColorIndex) [ ( startX, startY ) ] grid


fillLoop : Int -> Cell -> Cell -> List ( Int, Int ) -> Grid -> Grid
fillLoop size target fill stack grid =
    case stack of
        [] ->
            grid

        ( x, y ) :: rest ->
            if x < 0 || x >= size || y < 0 || y >= size then
                fillLoop size target fill rest grid

            else if cellAt x y grid /= target then
                fillLoop size target fill rest grid

            else
                fillLoop size
                    target
                    fill
                    (( x + 1, y ) :: ( x - 1, y ) :: ( x, y + 1 ) :: ( x, y - 1 ) :: rest)
                    (setCell x y fill grid)


fillPreviewPositions : Int -> Int -> Int -> Grid -> List ( Int, Int )
fillPreviewPositions startX startY fillColorIndex grid =
    let
        filled =
            floodFill startX startY fillColorIndex grid
    in
    toRows filled
        |> List.concatMap
            (\( y, row ) ->
                Array.toIndexedList row
                    |> List.filterMap
                        (\( x, cell ) ->
                            if cell /= cellAt x y grid then
                                Just ( x, y )

                            else
                                Nothing
                        )
            )


pushHistory : Grid -> List Grid -> List Grid
pushHistory grid stack =
    List.take maxHistory (grid :: stack)
