import { Effect } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'

import { expect, it } from '@effect/vitest'

import { Message, fetchWeather } from './weather'

const testClient = HttpClient.make(request =>
  Effect.succeed(
    HttpClientResponse.fromWeb(
      request,
      new Response(
        JSON.stringify({
          locationName: 'Beverly Hills',
          region: 'California',
          temperature: 72,
          description: 'Clear sky',
        }),
        { status: 200 },
      ),
    ),
  ),
)

it.effect('maps a weather response to SucceededFetchWeather', () =>
  Effect.gen(function* () {
    const message = yield* fetchWeather(testClient)({ zipCode: '90210' })

    expect(message).toEqual(
      Message.SucceededFetchWeather({
        weather: {
          locationName: 'Beverly Hills',
          region: 'California',
          temperature: 72,
          description: 'Clear sky',
        },
      }),
    )
  }),
)
