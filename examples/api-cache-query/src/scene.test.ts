import { Effect, Result } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { ApplicationBlock, layer } from './index'
import { AppTabsBlock } from './model'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  firstPostDetail,
  fixtureEffects,
  fixtureStats,
} from './model.fixture'
import { postQuery, postsQuery, statsQuery } from './query'

const FIRST_REQUEST_GENERATION = 1

const resolveFocusTab = Scene.Command.resolve(
  Tabs.test.FocusTab,
  AppTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect('the posts tab renders its loading state and navigation', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.init(),
      Scene.expect(Scene.text('Loading posts…')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Refresh' })).toExist(),
      Scene.expect(Scene.role('tab', { name: 'Posts' })).toExist(),
      Scene.expect(Scene.role('tab', { name: 'Stats' })).toExist(),
      Scene.Command.resolve(
        postsQuery.Fetch,
        postsQuery.Message.CompletedFetch({
          generation: FIRST_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
    ),
  )

  it.effect('clicking a post fetches its detail and renders it', () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(loadedPostsModel),
        Scene.click(Scene.role('button', { name: /First Post/ })),
        Scene.expect(Scene.text('Loading post…')).toExist(),
        Scene.Command.expectExact(postQuery.Fetch),
        Scene.Command.resolve(
          postQuery.Fetch,
          postQuery.Message.CompletedFetch({
            args: { postId: 'first-post' },
            generation: FIRST_REQUEST_GENERATION,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.succeed({
              post: firstPostDetail,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ),
        Scene.inside(
          Scene.role('article'),
          Scene.expect(Scene.text('By Grace Hopper')).toExist(),
          Scene.expect(
            Scene.text('The whole body of the first fixture post.'),
          ).toExist(),
        ),
        Scene.expect(Scene.role('button', { name: 'Back to posts' })).toExist(),
      )
    }),
  )

  it.effect('opening a cached post skips the fetch', () =>
    Effect.gen(function* () {
      const cachedFirstPostModel = yield* fixtureEffects.cachedFirstPostModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(cachedFirstPostModel),
        Scene.expect(Scene.text('Cached')).toExist(),
        Scene.click(Scene.role('button', { name: /First Post/ })),
        Scene.Command.expectNone(),
        Scene.expect(Scene.text('By Grace Hopper')).toExist(),
      )
    }),
  )

  it.effect('a failed post fetch shows the error with a Retry button', () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(loadedPostsModel),
        Scene.click(Scene.role('button', { name: /First Post/ })),
        Scene.Command.resolve(
          postQuery.Fetch,
          postQuery.Message.CompletedFetch({
            args: { postId: 'first-post' },
            generation: FIRST_REQUEST_GENERATION,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.fail('The connection dropped.'),
          }),
        ),
        Scene.expect(Scene.text('The connection dropped.')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Retry' })).toExist(),
      )
    }),
  )

  it.effect('switching to the Stats tab fetches and renders stats', () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(loadedPostsModel),
        Scene.click(Scene.role('tab', { name: 'Stats' })),
        Scene.expect(Scene.text('Loading stats…')).toExist(),
        resolveFocusTab,
        Scene.Command.expectExact(statsQuery.Fetch),
        Scene.Command.resolve(
          statsQuery.Fetch,
          statsQuery.Message.CompletedFetch({
            generation: FIRST_REQUEST_GENERATION,
            result: Result.succeed({
              stats: fixtureStats,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ),
        Scene.expect(Scene.text('Active users')).toExist(),
        Scene.expect(Scene.text('97%')).toExist(),
        Scene.expect(Scene.text('Updated at', { exact: false })).toExist(),
      )
    }),
  )
})
