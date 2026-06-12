toolbarView : Model -> PaletteTheme -> Html Msg
toolbarView model theme =
    div [ class "w-full md:w-44 flex flex-col gap-5 flex-shrink-0" ]
        [ lazy toolSection model.tool
        , lazy mirrorSection model.mirrorMode
        , lazy sizeSection model.gridSize
        , paletteSection model theme
        , lazy clearCanvasSection model.grid
        ]



-- The canvas keys each row and wraps it in lazy5. A row only
-- re-renders when one of its five arguments changes by reference.


            Html.Keyed.node "div"
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
