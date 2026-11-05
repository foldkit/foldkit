// ❌ Bad: the binding must be PascalCase and match the declared Command name.
import { makeCommand } from './block'

const fetchWeather = makeCommand('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})

const SaveWeather = makeCommand('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})

// ✅ Good: the declaration and binding name match.
const FetchWeather = makeCommand('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})
