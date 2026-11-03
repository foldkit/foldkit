import { Array, Effect, Option, pipe } from 'effect'
import { FetchHttpClient, HttpRouter } from 'effect/http'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { DomainsClient, makeDomainsClientLayer } from '../client/rpc'
import { DomainCandidateRange, domainTlds } from '../shared/domain'
import { DomainsRpcLayer } from './rpc'

const disposals: Array<() => Promise<void>> = []

const makeApi = () => {
  const api = HttpRouter.toWebHandler(DomainsRpcLayer, {
    disableLogger: true,
  })
  disposals.push(api.dispose)
  return api.handler
}

const callSearch = (
  handler: ReturnType<typeof makeApi>,
  label = 'acme',
  range: Partial<DomainCandidateRange> = {},
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const client = yield* DomainsClient
      return yield* client.SearchDomains({ label, ...range })
    }),
  ).pipe(
    Effect.provide(makeDomainsClientLayer('http://localhost/rpc')),
    Effect.provideService(FetchHttpClient.Fetch, (input, init) =>
      handler(new Request(input, init)),
    ),
  )

const rawRequest = (payload: Readonly<Record<string, unknown>>) =>
  new Request('http://localhost/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      _tag: 'Request',
      id: '0',
      tag: 'SearchDomains',
      payload,
      headers: [],
    }),
  })

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(disposals.splice(0).map(dispose => dispose()))
})

describe('demo domain search RPC', () => {
  test('returns deterministic sample domains through the typed transport without outbound HTTP', async () => {
    const outboundFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected outbound HTTP'))
    const handler = makeApi()
    const first = await Effect.runPromise(callSearch(handler))
    const repeated = await Effect.runPromise(callSearch(handler))

    expect(repeated).toEqual(first)
    expect(first).toHaveLength(domainTlds.length)
    expect(Option.getOrThrow(Array.head(first))).toEqual({
      _tag: 'Available',
      name: 'acme.com',
      tld: 'com',
      price: 12,
      renewalPrice: 12,
      years: 1,
      isPremium: false,
    })
    expect(Option.getOrThrow(Array.last(first)).name).toBe('acme.zone')
    expect(first).toContainEqual(
      expect.objectContaining({ name: 'acme.co.il', tld: 'co.il' }),
    )
    expect(outboundFetch).not.toHaveBeenCalled()
  })

  test('returns exactly the requested catalog slice and truncates at its end', async () => {
    const handler = makeApi()
    const full = await Effect.runPromise(callSearch(handler))
    const range = { offset: 60, limit: 60 }
    const page = await Effect.runPromise(callSearch(handler, 'acme', range))
    const tail = await Effect.runPromise(
      callSearch(handler, 'acme', {
        offset: domainTlds.length - 2,
        limit: 60,
      }),
    )
    const otherLabel = await Effect.runPromise(
      callSearch(handler, 'example', { offset: 0, limit: 4 }),
    )

    expect(page).toEqual(pipe(full, Array.drop(60), Array.take(60)))
    expect(tail).toEqual(Array.takeRight(full, 2))
    expect(Array.map(otherLabel, domain => domain.name)).toEqual([
      'example.com',
      'example.dev',
      'example.app',
      'example.io',
    ])
  })

  test('unconfirmed sample domains contain no prices or purchase terms', async () => {
    const handler = makeApi()
    const domains = await Effect.runPromise(
      callSearch(handler, 'foldkit', { offset: 0, limit: 2 }),
    )

    expect(domains).toEqual([
      { _tag: 'Unconfirmed', name: 'foldkit.com', tld: 'com' },
      { _tag: 'Unconfirmed', name: 'foldkit.dev', tld: 'dev' },
    ])
  })

  test.each(['', 'UPPERCASE', 'not a name!', '-bad', 'a'.repeat(64)])(
    'rejects invalid label %j at the server boundary',
    async label => {
      const handler = makeApi()
      const response = await handler(rawRequest({ label }))

      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.text()).toContain('Failure')
    },
  )

  test.each([
    { name: 'negative offset', range: { offset: -1, limit: 4 } },
    {
      name: 'offset beyond the catalog',
      range: { offset: domainTlds.length, limit: 4 },
    },
    { name: 'fractional offset', range: { offset: 0.5, limit: 4 } },
    { name: 'empty range', range: { offset: 0, limit: 0 } },
    {
      name: 'limit beyond the catalog',
      range: { offset: 0, limit: domainTlds.length + 1 },
    },
    { name: 'fractional limit', range: { offset: 0, limit: 1.5 } },
  ])('rejects $name at the server boundary', async ({ range }) => {
    const handler = makeApi()
    const response = await handler(rawRequest({ label: 'acme', ...range }))

    expect(await response.text()).toContain('Failure')
  })

  test('bounds the actual request body even when its declared length is smaller', async () => {
    const handler = makeApi()
    const response = await handler(
      new Request('http://localhost/rpc', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '1',
        },
        body: 'x'.repeat(1025),
      }),
    )

    expect(response.status).toBe(413)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  test('rejects non-JSON content and reports malformed JSON without crashing the handler', async () => {
    const handler = makeApi()
    const nonJson = await handler(
      new Request('http://localhost/rpc', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      }),
    )
    const malformed = await handler(
      new Request('http://localhost/rpc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }),
    )
    const valid = await handler(rawRequest({ label: 'acme', limit: 4 }))

    expect(nonJson.status).toBe(415)
    expect(nonJson.headers.get('cache-control')).toBe('no-store')
    expect(await malformed.text()).toContain('Defect')
    expect(valid.headers.get('cache-control')).toBe('no-store')
    expect(await valid.text()).toContain('acme.com')
  })
})
