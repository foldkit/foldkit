import { Effect } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedFetchWeather = m('CompletedFetchWeather')
const fetchWeatherEffect = Effect.succeed(CompletedFetchWeather())

export const fetchWeather = Command.define(
  'FetchWeather',
  CompletedFetchWeather,
)(fetchWeatherEffect)
