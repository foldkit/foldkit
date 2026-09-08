import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchWeather: {},
})

const fetchWeatherEffect = Effect.succeed(Message.CompletedFetchWeather())

export const FetchWeather = Command.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
  execute: fetchWeatherEffect,
})

export const defineLocal = (Command: { define: (name: string) => string }) =>
  Command.define('not-pascal-case')
