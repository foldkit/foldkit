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



-- And the encoder, written by hand in the other direction:


encodeSavedCanvas : Model -> Encode.Value
encodeSavedCanvas model =
    Encode.object
        [ ( "grid", encodeGrid model.grid )
        , ( "gridSize", Encode.int model.gridSize )
        , ( "paletteThemeIndex", Encode.int model.paletteThemeIndex )
        , ( "selectedColorIndex", Encode.int model.selectedColorIndex )
        ]
