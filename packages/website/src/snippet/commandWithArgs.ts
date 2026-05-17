import { Effect, Match as M, Schema as S } from 'effect'
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from 'effect/unstable/http'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const SubmittedWeatherForm = m('SubmittedWeatherForm')
const SucceededFetchWeather = m('SucceededFetchWeather', {
  weather: WeatherSchema,
})
const FailedFetchWeather = m('FailedFetchWeather', { error: S.String })

const FetchWeather = Command.define(
  'FetchWeather',
  // Args schema: the per-dispatch inputs the factory needs.
  { zipCode: S.String },
  SucceededFetchWeather,
  FailedFetchWeather,
)(
  // The factory receives a typed args record.
  ({ zipCode }) =>
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const response = yield* client.execute(
        HttpClientRequest.get(`/api/weather?zip=${zipCode}`),
      )
      const weather = yield* S.decodeUnknownEffect(WeatherSchema)(
        yield* response.json,
      )
      return SucceededFetchWeather({ weather })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(FailedFetchWeather({ error: String(error) })),
      ),
      Effect.provide(FetchHttpClient.layer),
    ),
)

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      // Pass args when dispatching the Command.
      SubmittedWeatherForm: () => [
        model,
        [FetchWeather({ zipCode: model.zipCodeInput })],
      ],
      SucceededFetchWeather: ({ weather }) => [{ ...model, weather }, []],
      FailedFetchWeather: () => [model, []],
    }),
  )
