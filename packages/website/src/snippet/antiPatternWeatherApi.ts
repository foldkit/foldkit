import { Context, Effect } from 'effect'

export class WeatherApi extends Context.Service<
  WeatherApi,
  Readonly<{ forecast: Effect.Effect<string, Error> }>
>()('WeatherApi') {}
