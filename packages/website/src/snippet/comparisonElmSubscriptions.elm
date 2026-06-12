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


keyboardDecoder : Model -> Decode.Decoder Msg
keyboardDecoder model =
    Decode.map5 KeyEvent
        (Decode.field "key" Decode.string)
        (Decode.field "ctrlKey" Decode.bool)
        (Decode.field "metaKey" Decode.bool)
        (Decode.field "shiftKey" Decode.bool)
        (Decode.field "altKey" Decode.bool)
        |> Decode.andThen (shortcutFor model)



-- shortcutFor maps the decoded event to a Msg, or fails the
-- decoder for keys the app does not care about.
