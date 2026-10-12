import { Effect, Layer } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { expect, test } from 'vitest'

import { FetchCount, FetchCountLayer, Message } from './counterHttpCommand'

test('decodes the count returned by the API', async () => {
  const responseData = { count: 42 }
  const testClient = HttpClient.make(request =>
    Effect.sync(() => {
      expect(request.url).toBe('https://example.test/api/count')

      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(responseData), { status: 200 }),
      )
    }),
  ).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl('https://example.test')),
  )
  const HttpTestLayer = Layer.succeed(HttpClient.HttpClient, testClient)
  const TestLayer = Layer.provide(FetchCountLayer, HttpTestLayer)
  const expectedMessage = Message.SucceededFetchCount(responseData)

  const resultMessage = await FetchCount().effect.pipe(
    Effect.provide(TestLayer),
    Effect.runPromise,
  )

  expect(resultMessage).toEqual(expectedMessage)
})
