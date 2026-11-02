-- Counter.elm exposes init, update, view, and subscriptions.
-- Its update also returns an OutMsg the parent can react to.


type alias Model =
  { counters : List ( Int, Counter.Model )
  , nextCounterId : Int
  , completedCount : Int
  }


type Msg
  = ClickedAddCounter
  | GotCounterMsg Int Counter.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    ClickedAddCounter ->
      let
        ( counter, counterCmd ) =
          Counter.init { max = 10 }
      in
      ( { model
          | counters = model.counters ++ [ ( model.nextCounterId, counter ) ]
          , nextCounterId = model.nextCounterId + 1
        }
      , Cmd.map (GotCounterMsg model.nextCounterId) counterCmd
      )

    GotCounterMsg counterId counterMsg ->
      case findCounter counterId model.counters of
        Nothing ->
          ( model, Cmd.none )

        Just counter ->
          let
            ( nextCounter, counterCmd, maybeOutMsg ) =
              Counter.update counterMsg counter

            nextModel =
              { model
                | counters =
                    replaceCounter counterId nextCounter model.counters
              }
          in
          case maybeOutMsg of
            Just Counter.ReachedMax ->
              ( { nextModel | completedCount = model.completedCount + 1 }
              , Cmd.map (GotCounterMsg counterId) counterCmd
              )

            Nothing ->
              ( nextModel, Cmd.map (GotCounterMsg counterId) counterCmd )


subscriptions : Model -> Sub Msg
subscriptions model =
  model.counters
    |> List.map
      (\( counterId, counter ) ->
        Sub.map (GotCounterMsg counterId) (Counter.subscriptions counter)
      )
    |> Sub.batch


view : Model -> Html Msg
view model =
  div []
    (List.map
      (\( counterId, counter ) ->
        Html.map (GotCounterMsg counterId) (Counter.view counter)
      )
      model.counters
      ++ [ button [ onClick ClickedAddCounter ] [ text "Add counter" ] ]
    )
