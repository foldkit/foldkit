import { Effect } from 'effect'
import { Command as Commands } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchWeather: {},
})

const fetchWeatherEffect = Effect.succeed(Message.CompletedFetchWeather())

export const fetchWeather = Commands.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
  execute: fetchWeatherEffect,
})
