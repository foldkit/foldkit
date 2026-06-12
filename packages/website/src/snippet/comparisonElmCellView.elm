rowView : Int -> Array Cell -> String -> List Int -> List String -> Html Msg
rowView y row previewColor previewColumns paletteColors =
    div [ class "flex flex-1" ]
        (Array.toIndexedList row
            |> List.map
                (\( x, cell ) ->
                    let
                        displayColor =
                            if List.member x previewColumns then
                                previewColor

                            else
                                cellColor paletteColors cell
                    in
                    cellView x y displayColor
                )
        )


cellView : Int -> Int -> String -> Html Msg
cellView x y backgroundColor =
    div
        [ onMouseDown (PressedCell x y)
        , onMouseEnter (EnteredCell x y)
        , style "flex" "1"
        , style "background-color" backgroundColor
        ]
        []
