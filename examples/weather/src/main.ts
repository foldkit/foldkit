import { Array, Effect, Match as M, Option, Schema as S, String } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { AsyncData, Command, Http, Runtime, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

// MODEL

export const WeatherData = S.Struct({
  zipCode: S.String,
  temperature: S.Number,
  description: S.String,
  humidity: S.Number,
  windSpeed: S.Number,
  locationName: S.String,
  region: S.String,
})
export type WeatherData = typeof WeatherData.Type

export const WeatherAsyncData = AsyncData.Schema(WeatherData, S.String)

export const Model = S.Struct({
  zipCodeInput: S.String,
  weather: WeatherAsyncData.schema,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedZipCodeInput: { value: S.String },
  SubmittedWeatherForm: {},
  SucceededFetchWeather: { weather: WeatherData },
  FailedFetchWeather: { error: S.String },
})

export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedZipCodeInput: ({ value }) => ({
      model: evo(model, {
        zipCodeInput: () => value,
      }),
    }),

    SubmittedWeatherForm: () => {
      if (AsyncData.isPending(model.weather)) {
        return { model }
      }
      return {
        model: evo(model, {
          weather: () => WeatherAsyncData.Loading(),
        }),
        commands: [FetchWeather({ zipCode: model.zipCodeInput })],
      }
    },

    SucceededFetchWeather: ({ weather }) => ({
      model: evo(model, {
        weather: () => WeatherAsyncData.Success({ data: weather }),
      }),
    }),

    FailedFetchWeather: ({ error }) => ({
      model: evo(model, {
        weather: () => WeatherAsyncData.Failure({ error }),
      }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    zipCodeInput: '',
    weather: WeatherAsyncData.Idle(),
  },
})

// COMMAND

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'

const GeocodingResult = S.Struct({
  name: S.String,
  latitude: S.Number,
  longitude: S.Number,
  admin1: S.OptionFromOptional(S.String),
})

const GeocodingResponse = S.Struct({
  results: S.OptionFromOptional(S.Array(GeocodingResult)),
})

const WeatherResponse = S.Struct({
  current: S.Struct({
    temperature_2m: S.Number,
    relative_humidity_2m: S.Number,
    wind_speed_10m: S.Number,
    weather_code: S.Number,
  }),
})

const weatherCodeToDescription = (code: number): string =>
  M.value(code).pipe(
    M.when(0, () => 'Clear sky'),
    M.whenOr(1, 2, 3, () => 'Partly cloudy'),
    M.whenOr(45, 48, () => 'Foggy'),
    M.whenOr(51, 53, 55, () => 'Drizzle'),
    M.whenOr(61, 63, 65, () => 'Rain'),
    M.whenOr(66, 67, () => 'Freezing rain'),
    M.whenOr(71, 73, 75, 77, () => 'Snow'),
    M.whenOr(80, 81, 82, () => 'Rain showers'),
    M.whenOr(85, 86, () => 'Snow showers'),
    M.whenOr(95, 96, 99, () => 'Thunderstorm'),
    M.orElse(() => 'Unknown'),
  )

export const fetchWeatherEffect = (zipCode: string) =>
  Effect.gen(function* () {
    if (String.isEmpty(zipCode.trim())) {
      return yield* Effect.fail(
        Message.FailedFetchWeather({ error: 'Zip code required' }),
      )
    }

    const client = yield* HttpClient.HttpClient

    const geocodeRequest = HttpClientRequest.get(GEOCODING_API).pipe(
      HttpClientRequest.setUrlParams({
        name: zipCode,
        count: '1',
        language: 'en',
        format: 'json',
      }),
    )
    const geocodeResponse = yield* client.execute(geocodeRequest)

    if (geocodeResponse.status !== 200) {
      return yield* Effect.fail(
        Message.FailedFetchWeather({ error: 'Location not found' }),
      )
    }

    const geocodeData = yield* S.decodeUnknownEffect(GeocodingResponse)(
      yield* geocodeResponse.json,
    )

    const geoResult = yield* geocodeData.results.pipe(
      Option.flatMap(Array.head),
      Option.match({
        onNone: () =>
          Effect.fail(
            Message.FailedFetchWeather({ error: 'Location not found' }),
          ),
        onSome: Effect.succeed,
      }),
    )

    const weatherRequest = HttpClientRequest.get(WEATHER_API).pipe(
      HttpClientRequest.setUrlParams({
        latitude: geoResult.latitude.toString(),
        longitude: geoResult.longitude.toString(),
        current:
          'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
      }),
    )
    const weatherResponse = yield* client.execute(weatherRequest)

    if (weatherResponse.status !== 200) {
      return yield* Effect.fail(
        Message.FailedFetchWeather({ error: 'Failed to fetch weather data' }),
      )
    }

    const weatherData = yield* S.decodeUnknownEffect(WeatherResponse)(
      yield* weatherResponse.json,
    )

    const weather = WeatherData.make({
      zipCode,
      temperature: Math.round(weatherData.current.temperature_2m),
      description: weatherCodeToDescription(weatherData.current.weather_code),
      humidity: weatherData.current.relative_humidity_2m,
      windSpeed: Math.round(weatherData.current.wind_speed_10m),
      locationName: geoResult.name,
      region: Option.getOrElse(geoResult.admin1, () => ''),
    })

    return Message.SucceededFetchWeather({ weather })
  }).pipe(
    Effect.catchTag('FailedFetchWeather', error => Effect.succeed(error)),
    Effect.catch(() =>
      Effect.succeed(
        Message.FailedFetchWeather({ error: 'Failed to fetch weather data' }),
      ),
    ),
  )

export const FetchWeather = Command.define('FetchWeather', {
  args: { zipCode: S.String },
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
  execute: ({ zipCode }) =>
    Effect.provide(fetchWeatherEffect(zipCode), Http.layer),
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Weather',
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      h.h1([h.Class('text-4xl font-bold text-blue-900 mb-8')], ['Weather']),

      h.form(
        [
          h.Class('flex flex-col gap-4 items-center w-full max-w-md'),
          h.OnSubmit(Message.SubmittedWeatherForm()),
        ],
        [
          Input.view(
            {
              id: 'location',
              value: model.zipCodeInput,
              placeholder: 'Enter a zip code',
              onInput: value => Message.UpdatedZipCodeInput({ value }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.Autocomplete('off'),
                  h.DataAttribute('1p-ignore', ''),
                  h.AriaLabel('Zip code'),
                  h.Class(
                    'w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 outline-none',
                  ),
                ]),
            },
            h,
          ),
          Button.view(
            {
              type: 'submit',
              isDisabled: AsyncData.isPending(model.weather),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition data-[disabled]:opacity-50',
                    ),
                  ],
                  [
                    AsyncData.isPending(model.weather)
                      ? 'Loading...'
                      : 'Get Weather',
                  ],
                ),
            },
            h,
          ),
        ],
      ),

      AsyncData.matchDataSplitEmpty(model.weather, {
        onIdle: () => h.empty,
        onLoading: () =>
          h.div(
            [h.Class('text-blue-600 font-semibold text-center')],
            ['Fetching weather...'],
          ),
        onFailure: error =>
          h.div(
            [
              h.Class(
                'p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg',
              ),
            ],
            [error],
          ),
        onData: weather =>
          h.div([h.Class('w-full max-w-md')], [weatherView(weather, h)]),
      }),
    ],
  ),
})

const weatherView = (weather: WeatherData, h: HtmlBuilder<Message>): Html =>
  h.article(
    [h.Class('bg-white rounded-xl shadow-lg p-8 w-full')],
    [
      h.h2(
        [h.Class('text-2xl font-bold text-gray-800 mb-3 text-center')],
        [weather.zipCode],
      ),
      h.p(
        [h.Class('text-center text-gray-600 mb-6')],
        [weather.locationName + ', ' + weather.region],
      ),

      h.div(
        [h.Class('text-center mb-6')],
        [
          h.div(
            [h.Class('text-6xl font-bold text-blue-600')],
            [`${weather.temperature}°F`],
          ),
          h.div([h.Class('text-xl text-gray-600 mt-2')], [weather.description]),
        ],
      ),

      h.div(
        [h.Class('grid grid-cols-2 gap-4 text-center')],
        [
          h.div(
            [h.Class('bg-blue-50 p-4 rounded-lg')],
            [
              h.div([h.Class('text-sm text-gray-600')], ['Humidity']),
              h.div(
                [h.Class('text-lg font-semibold')],
                [`${weather.humidity}%`],
              ),
            ],
          ),
          h.div(
            [h.Class('bg-blue-50 p-4 rounded-lg')],
            [
              h.div([h.Class('text-sm text-gray-600')], ['Wind Speed']),
              h.div(
                [h.Class('text-lg font-semibold')],
                [`${weather.windSpeed} mph`],
              ),
            ],
          ),
        ],
      ),
    ],
  )
