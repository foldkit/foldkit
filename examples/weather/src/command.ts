import { Array, Effect, Match, Option, Schema, String } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'

import { ApplicationDefinition } from './definition'
import { Message } from './message'
import { WeatherData } from './model'

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'

const GeocodingResult = Schema.Struct({
  name: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  admin1: Schema.OptionFromOptional(Schema.String),
})
type GeocodingResult = typeof GeocodingResult.Type

const GeocodingResponse = Schema.Struct({
  results: Schema.OptionFromOptional(Schema.Array(GeocodingResult)),
})
type GeocodingResponse = typeof GeocodingResponse.Type

const WeatherResponse = Schema.Struct({
  current: Schema.Struct({
    temperature_2m: Schema.Number,
    relative_humidity_2m: Schema.Number,
    wind_speed_10m: Schema.Number,
    weather_code: Schema.Number,
  }),
})
type WeatherResponse = typeof WeatherResponse.Type

const weatherCodeToDescription = (code: number): string =>
  Match.value(code).pipe(
    Match.when(0, () => 'Clear sky'),
    Match.whenOr(1, 2, 3, () => 'Partly cloudy'),
    Match.whenOr(45, 48, () => 'Foggy'),
    Match.whenOr(51, 53, 55, () => 'Drizzle'),
    Match.whenOr(61, 63, 65, () => 'Rain'),
    Match.whenOr(66, 67, () => 'Freezing rain'),
    Match.whenOr(71, 73, 75, 77, () => 'Snow'),
    Match.whenOr(80, 81, 82, () => 'Rain showers'),
    Match.whenOr(85, 86, () => 'Snow showers'),
    Match.whenOr(95, 96, 99, () => 'Thunderstorm'),
    Match.orElse(() => 'Unknown'),
  )

export const FetchWeather = ApplicationDefinition.makeCommand('FetchWeather', {
  args: { zipCode: Schema.String },
  messages: [Message.SucceededFetchWeather, Message.FailedFetchWeather],
  handler: function* () {
    const client = yield* HttpClient.HttpClient

    return ({ zipCode }) =>
      Effect.gen(function* () {
        if (String.isEmpty(zipCode.trim())) {
          return yield* Effect.fail(
            Message.FailedFetchWeather({ error: 'Zip code required' }),
          )
        }

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

        const geocodeData = yield* Schema.decodeUnknownEffect(
          GeocodingResponse,
        )(yield* geocodeResponse.json)

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
            Message.FailedFetchWeather({
              error: 'Failed to fetch weather data',
            }),
          )
        }

        const weatherData = yield* Schema.decodeUnknownEffect(WeatherResponse)(
          yield* weatherResponse.json,
        )

        const weather = WeatherData.make({
          zipCode,
          temperature: Math.round(weatherData.current.temperature_2m),
          description: weatherCodeToDescription(
            weatherData.current.weather_code,
          ),
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
            Message.FailedFetchWeather({
              error: 'Failed to fetch weather data',
            }),
          ),
        ),
      )
  },
})

export const EffectsLayer = FetchWeather.layer
