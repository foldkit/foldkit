import { Array, Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { fetchSearchResults } from './command'
import { Message } from './message'

describe('Search Commands', () => {
  it('loads and normalizes results from the supplied search service', async () => {
    const queries: Array<string> = []
    const loadedResults: Array<number> = []

    const message = await Effect.runPromise(
      fetchSearchResults(
        {
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
        },
        'Commands',
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
    const message = await Effect.runPromise(
      fetchSearchResults(
        {
          search: async () => {
            throw new Error('Search unavailable')
          },
        },
        'Commands',
      ),
    )

    expect(message).toEqual(
      Message.CompletedFetchSearchResults({ query: 'Commands', results: [] }),
    )
  })
})
