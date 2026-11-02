import { Array, Effect, pipe } from 'effect'

import { expect, test } from '@playwright/test'

import { DomainsClient, makeDomainsClientLayer } from '../src/client/rpc'
import { makeDemoDomains } from '../src/shared/demoDomains'
import type { DomainCandidateRange } from '../src/shared/domain'

const searchDomains = (
  baseURL: string | undefined,
  label: string,
  range: Partial<DomainCandidateRange> = {},
) => {
  if (baseURL === undefined) {
    throw new Error('The Worker RPC regression requires a base URL')
  }

  return Effect.scoped(
    Effect.gen(function* () {
      const client = yield* DomainsClient
      return yield* client.SearchDomains({ label, ...range })
    }),
  ).pipe(
    Effect.provide(makeDomainsClientLayer(`${baseURL}/rpc`)),
    Effect.timeout('10 seconds'),
  )
}

test('production demo RPC returns the requested range and repeatable complete results', async ({
  baseURL,
}) => {
  const label = 'rpc-demo'
  const expected = makeDemoDomains(label)

  expect(await Effect.runPromise(searchDomains(baseURL, label))).toEqual(
    expected,
  )
  expect(
    await Effect.runPromise(
      searchDomains(baseURL, label, { offset: 4, limit: 56 }),
    ),
  ).toEqual(pipe(expected, Array.drop(4), Array.take(56)))
  expect(await Effect.runPromise(searchDomains(baseURL, label))).toEqual(
    expected,
  )
})

test('overlapping HTTP requests return independent query and range results', async ({
  baseURL,
}) => {
  const searches = Array.map(Array.range(1, 30), index => ({
    label: `overlap-${index}`,
    offset: index,
    limit: 4,
  }))
  const responses = await Effect.runPromise(
    Effect.all(
      Array.map(searches, ({ label, offset, limit }) =>
        searchDomains(baseURL, label, { offset, limit }),
      ),
      { concurrency: 'unbounded' },
    ),
  )

  expect(responses).toEqual(
    Array.map(searches, ({ label, offset, limit }) =>
      pipe(makeDemoDomains(label), Array.drop(offset), Array.take(limit)),
    ),
  )
})

test('RPC rejects unsupported media and oversized bodies without caching responses', async ({
  request,
}) => {
  const unsupported = await request.post('/rpc', {
    headers: { 'content-type': 'text/plain' },
    data: 'not JSON',
  })
  expect(unsupported.status()).toBe(415)
  expect(unsupported.headers()['cache-control']).toBe('no-store')

  const oversized = await request.post('/rpc', {
    data: { padding: 'x'.repeat(2000) },
  })
  expect(oversized.status()).toBe(413)
  expect(oversized.headers()['cache-control']).toBe('no-store')
})
