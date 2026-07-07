import { Command } from 'foldkit'

// ❌ Bad
// Hand-rolling the Command struct skips the identity, args, and tracing
// metadata that Command.define attaches.
const SaveDraft = {
  name: 'SaveDraft',
  effect: saveDraftEffect,
}

// ✅ Good
const FetchWeather = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
)(fetchWeatherEffect)
