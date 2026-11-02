import { Effect } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'

import { expect, it } from '@effect/vitest'

import { Application, fetchCount } from './counterHttpCommand'

it.effect('decodes the count returned by the API', () =>
  Effect.gen(function* () {
    const testClient = HttpClient.make(request =>
      Effect.sync(() => {
        expect(request.url).toBe('https://example.test/api/count')

        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ count: 42 }), { status: 200 }),
        )
      }),
    ).pipe(
      HttpClient.mapRequest(
        HttpClientRequest.prependUrl('https://example.test'),
      ),
    )

    const resultMessage = yield* fetchCount(testClient)

    expect(resultMessage).toEqual(
      Application.Message.SucceededFetchCount({ count: 42 }),
    )
  }),
)
