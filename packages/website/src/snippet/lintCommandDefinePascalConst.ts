import { Command } from 'foldkit'

// ❌ Bad
// A Command binding should be PascalCase, like the Command name it holds.
const fetchWeather = Command.define('FetchWeather', {
  messages: [SucceededFetchWeather],
  execute: fetchWeatherEffect,
})

// ✅ Good
const FetchWeather = Command.define('FetchWeather', {
  messages: [SucceededFetchWeather],
  execute: fetchWeatherEffect,
})
