suite : Test
suite =
    test "undo restores the previous grid state" <|
        \() ->
            let
                -- The Cmd in each returned tuple is discarded with `_`.
                -- A Cmd is opaque: there is no way to look inside one,
                -- so there is no way to assert that ReleasedMouse
                -- actually triggered a save.
                ( afterPress, _ ) =
                    update (PressedCell 0 0) initialModel

                ( afterRelease, _ ) =
                    update ReleasedMouse afterPress

                ( afterUndo, _ ) =
                    update ClickedUndo afterRelease
            in
            Expect.all
                [ \model -> Expect.equal (Grid.cellAt 0 0 model.grid) Nothing
                , \model -> Expect.equal model.undoStack []
                , \model -> Expect.equal (List.length model.redoStack) 1
                ]
                afterUndo
