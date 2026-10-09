import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Command, Http, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  SubmittedWeatherForm: {},
  SucceededFetchWeather: { weather: WeatherSchema },
  FailedFetchWeather: { error: Schema.String },
})

const FetchWeather = Command.define('FetchWeather', {
  // Args schema: the per-dispatch inputs the Command needs.
  args: { zipCode: Schema.String },
  // Every Message this Command can produce.
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
})

// The handler receives a typed args record.
const FetchWeatherLive = FetchWeather.toLayer(({ zipCode }) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.execute(
      HttpClientRequest.get(`/api/weather?zip=${zipCode}`),
    )
    const weather = yield* Schema.decodeUnknownEffect(WeatherSchema)(
      yield* response.json,
    )
    return Message.SucceededFetchWeather({ weather })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedFetchWeather({ error: String(error) })),
    ),
    Effect.provide(Http.layer),
  ),
)

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    // Pass args when dispatching the Command.
    SubmittedWeatherForm: () => ({
      model,
      commands: [FetchWeather({ zipCode: model.zipCodeInput })],
    }),
    SucceededFetchWeather: ({ weather }) => ({
      model: modifyFields(model, { weather: () => weather }),
    }),
    FailedFetchWeather: () => ({ model }),
  }),
)
