import { Command } from 'foldkit'

// ❌ Bad
// Hand-rolling the Command struct skips the identity, args, and tracing
// metadata that Command.define attaches.
const FetchWeather = {
  name: 'FetchWeather',
  effect: fetchWeatherEffect,
}

// ✅ Good
const FetchWeatherFixed = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
)(fetchWeatherEffect)
