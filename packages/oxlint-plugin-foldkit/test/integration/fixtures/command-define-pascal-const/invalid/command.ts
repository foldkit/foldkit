import { Effect } from 'effect'
import { Command as Commands } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchWeather: {},
})

const fetchWeatherEffect = Effect.succeed(Message.CompletedFetchWeather())

const owner = {
  name: (value: string) => value,
}

export const fetchWeather = Commands.define('FetchWeather', {
  messages: [Message.CompletedFetchWeather],
  execute: fetchWeatherEffect,
})

const roomName = 'CreateRoom'
export const CreateRoom = Commands.define(owner.name(roomName), {
  messages: [Message.CompletedFetchWeather],
  handler: fetchWeatherEffect,
})
