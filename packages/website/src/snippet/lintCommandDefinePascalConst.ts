import { Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchWeather: { temperature: Schema.Number },
})
type Message = typeof Message.Type

// ❌ Bad
// The const must be PascalCase and match the declared Command name.
const fetchWeather = Command.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})

const SaveWeather = Command.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})

// ✅ Good
// The Command name and the const name match.
const FetchWeather = Command.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
})
