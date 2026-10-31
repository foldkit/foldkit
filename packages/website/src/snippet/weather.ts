import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { AsyncData, Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Weather = Schema.Struct({
  locationName: Schema.String,
  region: Schema.String,
  temperature: Schema.Number,
  description: Schema.String,
})
export type Weather = typeof Weather.Type

export const WeatherAsyncData = AsyncData.Schema(Weather, Schema.String)

export const Model = Schema.Struct({
  zipCode: Schema.String,
  weatherAsyncData: WeatherAsyncData.schema,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedZipCode: { value: Schema.String },
  SubmittedWeatherForm: {},
  SucceededFetchWeather: { weather: Weather },
  FailedFetchWeather: { error: Schema.String },
})
export type Message = typeof Message.Type

export const FetchWeather = Command.define('FetchWeather', {
  args: { zipCode: Schema.String },
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
})

const WeatherResponse = Schema.Struct({
  locationName: Schema.String,
  region: Schema.String,
  temperature: Schema.Number,
  description: Schema.String,
})

export const fetchWeather =
  (client: HttpClient.HttpClient) =>
  ({ zipCode }: Readonly<{ zipCode: string }>) =>
    client.execute(HttpClientRequest.get(`/api/weather/${zipCode}`)).pipe(
      Effect.flatMap(response => response.json),
      Effect.flatMap(Schema.decodeUnknownEffect(WeatherResponse)),
      Effect.map(weather => Message.SucceededFetchWeather({ weather })),
      Effect.catch(() =>
        Effect.succeed(
          Message.FailedFetchWeather({ error: 'Weather unavailable' }),
        ),
      ),
    )

const weatherView = (weather: Weather, h: HtmlBuilder<Message>): Html =>
  h.article(
    [],
    [
      h.h2([], [`${weather.locationName}, ${weather.region}`]),
      h.p([], [`${weather.temperature}\u00B0F`]),
      h.p([], [weather.description]),
    ],
  )

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [FetchWeather],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      model: { zipCode: '', weatherAsyncData: WeatherAsyncData.Idle() },

      update: {
        UpdatedZipCode: (model, { value }) => ({
          model: modifyFields(model, { zipCode: () => value }),
        }),
        SubmittedWeatherForm: model => ({
          model: modifyFields(model, {
            weatherAsyncData: () => WeatherAsyncData.Loading(),
          }),
          commands: [FetchWeather({ zipCode: model.zipCode })],
        }),
        SucceededFetchWeather: (model, { weather }) => ({
          model: modifyFields(model, {
            weatherAsyncData: () => WeatherAsyncData.Success({ data: weather }),
          }),
        }),
        FailedFetchWeather: (model, { error }) => ({
          model: modifyFields(model, {
            weatherAsyncData: () => WeatherAsyncData.Failure({ error }),
          }),
        }),
      },

      commands: { FetchWeather: fetchWeather(client) },

      view: (model, h) => ({
        title: 'Weather',
        body: h.main(
          [],
          [
            h.form(
              [h.OnSubmit(Message.SubmittedWeatherForm())],
              [
                h.label([h.For('zip-code')], ['Zip code']),
                h.input([
                  h.Id('zip-code'),
                  h.Value(model.zipCode),
                  h.OnInput(value => Message.UpdatedZipCode({ value })),
                ]),
                h.button(
                  [h.Type('submit')],
                  [
                    AsyncData.isLoading(model.weatherAsyncData)
                      ? 'Loading...'
                      : 'Get Weather',
                  ],
                ),
              ],
            ),
            AsyncData.match(model.weatherAsyncData, {
              onIdle: () => h.empty,
              onLoading: () => h.empty,
              onRefreshing: weather => weatherView(weather, h),
              onFailure: error => h.p([h.Role('alert')], [error]),
              onStale: ({ data }) => weatherView(data, h),
              onSuccess: weather => weatherView(weather, h),
            }),
          ],
        ),
      }),
    }
  }),
)
