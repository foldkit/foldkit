import type { Model, WeatherData } from './main'
import { WeatherInit } from './main'

export const weatherModel: Model = {
  zipCodeInput: '90210',
  weather: WeatherInit(),
}

export const weatherData: WeatherData = {
  zipCode: '90210',
  temperature: 72,
  description: 'Clear sky',
  humidity: 45,
  windSpeed: 10,
  locationName: 'Beverly Hills',
  region: 'California',
}

export const mockGeocodingResponse: Readonly<{
  results: ReadonlyArray<
    Readonly<{
      name: string
      latitude: number
      longitude: number
      admin1: string
    }>
  >
  generationtime_ms: number
}> = {
  results: [
    {
      name: 'Beverly Hills',
      latitude: 34.07362,
      longitude: -118.40036,
      admin1: 'California',
    },
  ],
  generationtime_ms: 0.5,
}

export const mockWeatherResponse: Readonly<{
  current: Readonly<{
    time: string
    interval: number
    temperature_2m: number
    relative_humidity_2m: number
    wind_speed_10m: number
    weather_code: number
  }>
}> = {
  current: {
    time: '2026-03-10T01:30',
    interval: 900,
    temperature_2m: 72.4,
    relative_humidity_2m: 45,
    wind_speed_10m: 9.8,
    weather_code: 0,
  },
}
