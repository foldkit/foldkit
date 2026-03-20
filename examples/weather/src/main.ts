import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import { Array, Effect, Match as M, Option, Schema as S, String } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

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

export const WeatherInit = ts('WeatherInit')
export const WeatherLoading = ts('WeatherLoading')
export const WeatherSuccess = ts('WeatherSuccess', { data: WeatherData })
export const WeatherFailure = ts('WeatherFailure', { error: S.String })

const WeatherAsyncResult = S.Union(
  WeatherInit,
  WeatherLoading,
  WeatherSuccess,
  WeatherFailure,
)
type WeatherAsyncResult = typeof WeatherAsyncResult.Type

export const Model = S.Struct({
  zipCodeInput: S.String,
  weather: WeatherAsyncResult,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedZipCodeInput = m('UpdatedZipCodeInput', {
  value: S.String,
})
export const SubmittedWeatherForm = m('SubmittedWeatherForm')
export const SucceededFetchWeather = m('SucceededFetchWeather', {
  weather: WeatherData,
})
export const FailedFetchWeather = m('FailedFetchWeather', { error: S.String })

const Message = S.Union(
  UpdatedZipCodeInput,
  SubmittedWeatherForm,
  SucceededFetchWeather,
  FailedFetchWeather,
)
type Message = typeof Message.Type

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      UpdatedZipCodeInput: ({ value }) => [
        evo(model, {
          zipCodeInput: () => value,
        }),
        [],
      ],

      SubmittedWeatherForm: () => [
        evo(model, {
          weather: () => WeatherLoading(),
        }),
        [fetchWeatherLive(model.zipCodeInput)],
      ],

      SucceededFetchWeather: ({ weather }) => [
        evo(model, {
          weather: () => WeatherSuccess({ data: weather }),
        }),
        [],
      ],

      FailedFetchWeather: ({ error }) => [
        evo(model, {
          weather: () => WeatherFailure({ error }),
        }),
        [],
      ],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    zipCodeInput: '',
    weather: WeatherInit(),
  },
  [],
]

// COMMAND

const FetchWeather = Command.define('FetchWeather')

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'

const GeocodingResult = S.Struct({
  name: S.String,
  latitude: S.Number,
  longitude: S.Number,
  admin1: S.OptionFromUndefinedOr(S.String),
})

const GeocodingResponse = S.Struct({
  results: S.OptionFromUndefinedOr(S.Array(GeocodingResult)),
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

export const fetchWeather = (zipCode: string) =>
  FetchWeather(
    Effect.gen(function* () {
      if (String.isEmpty(zipCode.trim())) {
        return yield* Effect.fail(
          FailedFetchWeather({ error: 'Zip code required' }),
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
          FailedFetchWeather({ error: 'Location not found' }),
        )
      }

      const geocodeData = yield* S.decodeUnknown(GeocodingResponse)(
        yield* geocodeResponse.json,
      )

      const geoResult = yield* geocodeData.results.pipe(
        Option.flatMap(Array.head),
        Option.match({
          onNone: () =>
            Effect.fail(FailedFetchWeather({ error: 'Location not found' })),
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
          FailedFetchWeather({ error: 'Failed to fetch weather data' }),
        )
      }

      const weatherData = yield* S.decodeUnknown(WeatherResponse)(
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

      return SucceededFetchWeather({ weather })
    }).pipe(
      Effect.scoped,
      Effect.catchTag('FailedFetchWeather', error => Effect.succeed(error)),
      Effect.catchAll(() =>
        Effect.succeed(
          FailedFetchWeather({ error: 'Failed to fetch weather data' }),
        ),
      ),
    ),
  )

const fetchWeatherLive = (zipCode: string) =>
  Command.mapEffect(fetchWeather(zipCode), effect =>
    effect.pipe(
      Effect.locally(HttpClient.currentTracerPropagation, false),
      Effect.provide(FetchHttpClient.layer),
    ),
  )

// VIEW

const {
  article,
  button,
  div,
  empty,
  form,
  h1,
  h2,
  input,
  label,
  p,
  Class,
  Disabled,
  For,
  Id,
  OnInput,
  OnSubmit,
  Autocomplete,
  Placeholder,
  Type,
} = html<Message>()

const view = (model: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      h1([Class('text-4xl font-bold text-blue-900 mb-8')], ['Weather']),

      form(
        [
          Class('flex flex-col gap-4 items-center w-full max-w-md'),
          OnSubmit(SubmittedWeatherForm()),
        ],
        [
          label([For('location'), Class('sr-only')], ['Location']),
          input([
            Id('location'),
            Class(
              'w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 outline-none',
            ),
            Autocomplete('off'),
            Placeholder('Enter a zip code'),
            OnInput(value => UpdatedZipCodeInput({ value })),
          ]),
          button(
            [
              Type('submit'),
              Disabled(model.weather._tag === 'WeatherLoading'),
              Class(
                'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50',
              ),
            ],
            [
              model.weather._tag === 'WeatherLoading'
                ? 'Loading...'
                : 'Get Weather',
            ],
          ),
        ],
      ),

      M.value(model.weather).pipe(
        M.tagsExhaustive({
          WeatherInit: () => empty,
          WeatherLoading: () =>
            div(
              [Class('text-blue-600 font-semibold text-center')],
              ['Fetching weather...'],
            ),
          WeatherFailure: ({ error }) =>
            div(
              [
                Class(
                  'p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg',
                ),
              ],
              [error],
            ),
          WeatherSuccess: ({ data: weather }) => weatherView(weather),
        }),
      ),
    ],
  )

const weatherView = (weather: WeatherData): Html =>
  article(
    [Class('bg-white rounded-xl shadow-lg p-8 max-w-md w-full')],
    [
      h2(
        [Class('text-2xl font-bold text-gray-800 mb-3 text-center')],
        [weather.zipCode],
      ),
      p(
        [Class('text-center text-gray-600 mb-6')],
        [weather.locationName + ', ' + weather.region],
      ),

      div(
        [Class('text-center mb-6')],
        [
          div(
            [Class('text-6xl font-bold text-blue-600')],
            [`${weather.temperature}°F`],
          ),
          div([Class('text-xl text-gray-600 mt-2')], [weather.description]),
        ],
      ),

      div(
        [Class('grid grid-cols-2 gap-4 text-center')],
        [
          div(
            [Class('bg-blue-50 p-4 rounded-lg')],
            [
              div([Class('text-sm text-gray-600')], ['Humidity']),
              div([Class('text-lg font-semibold')], [`${weather.humidity}%`]),
            ],
          ),
          div(
            [Class('bg-blue-50 p-4 rounded-lg')],
            [
              div([Class('text-sm text-gray-600')], ['Wind Speed']),
              div(
                [Class('text-lg font-semibold')],
                [`${weather.windSpeed} mph`],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
