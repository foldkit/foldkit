import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchWeather: {},
})

const fetchWeatherEffect = Effect.succeed(Message.CompletedFetchWeather())

const owner = {
  name: (value: string) => value,
}

export const FetchWeather = Command.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
  handler: fetchWeatherEffect,
})

export const CreateRoom = Command.define(owner.name('CreateRoom'), {
  messages: [Message.CompletedFetchWeather],
  handler: fetchWeatherEffect,
})

export const defineLocal = (Command: { define: (name: string) => string }) =>
  Command.define('not-pascal-case')
