// ❌ Bad: the binding must be PascalCase and match the declared Command name.
const fetchWeather = WeatherBlock.makeCommand('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})

const SaveWeather = WeatherBlock.makeCommand('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})

// ✅ Good: the declaration and binding name match.
const FetchWeather = WeatherBlock.makeCommand('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})
