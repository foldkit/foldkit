import { Effect, Schema as S } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { Command, Http, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  SubmittedWeatherForm: {},
  SucceededFetchWeather: { weather: WeatherSchema },
  FailedFetchWeather: { error: S.String },
})

const FetchWeather = Command.define('FetchWeather', {
  // Args schema: the per-dispatch inputs the Command needs.
  args: { zipCode: S.String },
  // Every Message this Command can produce.
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
  // The Effect receives a typed args record.
  execute: ({ zipCode }) =>
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const response = yield* client.execute(
        HttpClientRequest.get(`/api/weather?zip=${zipCode}`),
      )
      const weather = yield* S.decodeUnknownEffect(WeatherSchema)(
        yield* response.json,
      )
      return Message.SucceededFetchWeather({ weather })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(Message.FailedFetchWeather({ error: String(error) })),
      ),
      Effect.provide(Http.layer),
    ),
})

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    // Pass args when dispatching the Command.
    SubmittedWeatherForm: () => ({
      model,
      commands: [FetchWeather({ zipCode: model.zipCodeInput })],
    }),
    SucceededFetchWeather: ({ weather }) => ({ model: { ...model, weather } }),
    FailedFetchWeather: () => ({ model }),
  })
