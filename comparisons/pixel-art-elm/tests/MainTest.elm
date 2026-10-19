module MainTest exposing (suite)

import Expect
import Grid
import Main exposing (Msg(..), defaultModel, update)
import Test exposing (Test, test)


suite : Test
suite =
  test "undo restores the previous grid state" <|
    \() ->
      let
        ( afterPress, _ ) =
          update (PressedCell 0 0) defaultModel

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
