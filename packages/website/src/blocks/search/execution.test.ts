import { Array, Effect, Layer } from 'effect'
import { describe, expect, vi } from 'vitest'

import { it } from '@effect/vitest'

import { PagefindService } from '../../pagefind'
import { FetchSearchResults } from './command'
import { EffectsLayer } from './effectsLayer'
import { Message } from './message'

describe('Search Command execution', () => {
  it.effect(
    'loads and normalizes results from the supplied search service',
    () => {
      const resultData = Array.map(Array.range(1, 10), index =>
        vi.fn(async () => ({
          url: `/result/${index}`,
          excerpt: `Excerpt ${index}`,
        })),
      )
      const search = vi.fn(async (_query: string) => ({
        results: Array.map(resultData, data => ({ data })),
      }))
      const PagefindTestLayer = Layer.succeed(PagefindService, {
        search,
      })

      return FetchSearchResults({ query: 'Commands' }).effect.pipe(
        Effect.provide(Layer.provide(EffectsLayer, PagefindTestLayer)),
        Effect.tap(message =>
          Effect.sync(() => {
            expect(search).toHaveBeenCalledOnce()
            expect(search).toHaveBeenCalledWith('Commands')

            resultData.forEach((data, index) => {
              expect(data).toHaveBeenCalledTimes(index < 8 ? 1 : 0)
            })

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
          }),
        ),
      )
    },
  )

  it.effect(
    'converts a supplied search service failure into an empty result',
    () => {
      const search = vi.fn(async () => {
        throw new Error('Search unavailable')
      })
      const PagefindTestLayer = Layer.succeed(PagefindService, {
        search,
      })

      return FetchSearchResults({ query: 'Commands' }).effect.pipe(
        Effect.provide(Layer.provide(EffectsLayer, PagefindTestLayer)),
        Effect.tap(message =>
          Effect.sync(() => {
            expect(search).toHaveBeenCalledOnce()
            expect(search).toHaveBeenCalledWith('Commands')
            expect(message).toEqual(
              Message.CompletedFetchSearchResults({
                query: 'Commands',
                results: [],
              }),
            )
          }),
        ),
      )
    },
  )
})
