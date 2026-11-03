import { Array, Effect } from 'effect'
import { withBlock } from 'foldkit/experimental/layered/testing'
import { Command } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { ReadCurrentTime, ReleaseEarlySearchListeners } from './command'
import { urlOrThrow } from './model.fixture'
import { routeToQuery } from './route'
import { searchViewState } from './searchViewState'

describe('startup', () => {
  test.each([
    { path: '/', query: '', viewStateTag: 'Idle', clocks: [] },
    {
      path: '/?q=Acme.dev',
      query: 'Acme.dev',
      viewStateTag: 'Loading',
      clocks: [
        {
          searchGeneration: 1,
          offset: 0,
          limit: 4,
          isRefreshRequested: false,
        },
      ],
    },
    {
      path: '/?q=not%20a%20domain!',
      query: 'not a domain!',
      viewStateTag: 'Failed',
      clocks: [],
    },
    { path: '/?q=', query: '', viewStateTag: 'Idle', clocks: [] },
  ])(
    'initializes $path from the URL and clocks valid searches before loading domain results',
    async ({ path, query, viewStateTag, clocks }) => {
      await Effect.runPromise(
        withBlock(ApplicationBlock, block => {
          const applicationInit = block.init(
            urlOrThrow(`http://localhost${path}`),
          )

          expect(applicationInit.model.searchLayout).toBe(
            query ? 'Search' : 'Landing',
          )
          expect(applicationInit.model.cart).toEqual([])
          expect(routeToQuery(applicationInit.model.route)).toBe(query)
          expect(searchViewState(applicationInit.model)._tag).toBe(viewStateTag)
          expect(
            Array.getSomes(
              Array.map(
                applicationInit.commands ?? [],
                Command.argsOf(ReadCurrentTime),
              ),
            ),
          ).toEqual(clocks)
          expect(
            Array.getSomes(
              Array.map(
                applicationInit.commands ?? [],
                Command.argsOf(ReleaseEarlySearchListeners),
              ),
            ),
          ).toHaveLength(1)
        }),
      )
    },
  )
})
