import { Array, Effect, Option } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/unstable/http'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { layer } from './index.js'

const REQUEST_URL = 'https://api.example.com/data'

const makeFakeFetch = (): Readonly<{
  fetch: typeof globalThis.fetch
  requestHeaders: Array<Headers>
}> => {
  const requestHeaders: Array<Headers> = []
  const fetch: typeof globalThis.fetch = (_input, init) => {
    requestHeaders.push(new Headers(init?.headers))
    return Promise.resolve(new Response('{}', { status: 200 }))
  }
  return { fetch, requestHeaders }
}

const request = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  yield* client.get(REQUEST_URL)
})

const requestInsideCommandSpan = Effect.withSpan(request, 'FetchData')

const capturedHeaders = (requestHeaders: ReadonlyArray<Headers>): Headers =>
  Option.getOrThrow(Array.head(requestHeaders))

describe('layer', () => {
  it.effect('omits trace propagation headers, even inside a Command span', () =>
    Effect.gen(function* () {
      const { fetch, requestHeaders } = makeFakeFetch()

      yield* requestInsideCommandSpan.pipe(
        Effect.provide(layer),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
      )

      const headers = capturedHeaders(requestHeaders)
      expect(headers.has('traceparent')).toBe(false)
      expect(headers.has('b3')).toBe(false)
    }),
  )

  it.effect(
    'plain FetchHttpClient.layer adds trace headers with no ambient span',
    () =>
      Effect.gen(function* () {
        const { fetch, requestHeaders } = makeFakeFetch()

        yield* request.pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, fetch),
        )

        const headers = capturedHeaders(requestHeaders)
        expect(headers.has('traceparent')).toBe(true)
      }),
  )

  it.effect(
    'a per-Command TracerPropagationEnabled override re-enables propagation',
    () =>
      Effect.gen(function* () {
        const { fetch, requestHeaders } = makeFakeFetch()

        yield* requestInsideCommandSpan.pipe(
          Effect.provideService(HttpClient.TracerPropagationEnabled, true),
          Effect.provide(layer),
          Effect.provideService(FetchHttpClient.Fetch, fetch),
        )

        const headers = capturedHeaders(requestHeaders)
        expect(headers.has('traceparent')).toBe(true)
      }),
  )
})
