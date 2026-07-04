import { Command } from 'foldkit'

// ❌ Bad
// The Command type is already carried by Command.define; annotating it is noise.
const FetchWeather: Command.Command<Message> = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
)(fetchWeatherEffect)

// ✅ Good
const FetchWeatherFixed = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
)(fetchWeatherEffect)
