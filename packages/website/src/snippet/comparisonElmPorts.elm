port module Main exposing (main)

-- The Elm side: ports declare that JavaScript exists, nothing more.


port saveCanvas : Encode.Value -> Cmd msg


port requestExportPng : Encode.Value -> Cmd msg


port exportPngFailed : (String -> msg) -> Sub msg



-- In update: send a request out, receive the failure (if any) back
-- as a Msg through the subscription.


        ClickedExport ->
            ( model, requestExportPng (encodeExportRequest model) )

        FailedExportPng error ->
            ( { model | exportError = Just error }, Cmd.none )
