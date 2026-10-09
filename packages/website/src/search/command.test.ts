import { Array, Effect, Layer } from 'effect'
import { describe, expect, it } from 'vitest'

import { Live } from './live'
import { Message } from './message'
import { PagefindService } from './pagefind'
import { FetchSearchResults } from './update'

describe('Search Command services', () => {
  it('loads and normalizes results from the supplied search service', async () => {
    const queries: Array<string> = []
    const loadedResults: Array<number> = []
    const PagefindTest = Layer.succeed(PagefindService, {
      search: async query => {
        queries.push(query)
        return {
          results: Array.map(Array.range(1, 10), index => ({
            data: async () => {
              loadedResults.push(index)
              return {
                url: `/result/${index}`,
                excerpt: `Excerpt ${index}`,
              }
            },
          })),
        }
      },
    })

    const message = await Effect.runPromise(
      FetchSearchResults({ query: 'Commands' }).effect.pipe(
        Effect.provide(Layer.provide(Live, PagefindTest)),
      ),
    )

    expect(queries).toEqual(['Commands'])
    expect(loadedResults).toEqual(Array.range(1, 8))
    expect(message).toEqual(
      Message.CompletedFetchSearchResults({
        query: 'Commands',
        results: Array.map(Array.range(1, 8), index => ({
          url: `/result/${index}`,
          title: 'Untitled',
          excerpt: `Excerpt ${index}`,
          section: '',
          kind: '',
        })),
      }),
    )
  })

  it('converts a supplied search service failure into an empty result', async () => {
    const PagefindTest = Layer.succeed(PagefindService, {
      search: async () => {
        throw new Error('Search unavailable')
      },
    })

    const message = await Effect.runPromise(
      FetchSearchResults({ query: 'Commands' }).effect.pipe(
        Effect.provide(Layer.provide(Live, PagefindTest)),
      ),
    )

    expect(message).toEqual(
      Message.CompletedFetchSearchResults({ query: 'Commands', results: [] }),
    )
  })
})
