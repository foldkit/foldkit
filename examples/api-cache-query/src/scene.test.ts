import { Effect, Result } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { AppLayer } from './layer'
import { AppTabsBlock } from './model'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  firstPostDetail,
  fixtureStats,
  test,
} from './model.fixture'
import { postQuery, statsQuery } from './query'

const FIRST_REQUEST_GENERATION = 1

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  AppTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  test('the posts tab renders its loading state and navigation', async ({
    models: { loadingPostsModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(loadingPostsModel),
        expect(text('Loading posts…')).toExist(),
        expect(role('button', { name: 'Refresh' })).toExist(),
        expect(role('tab', { name: 'Posts' })).toExist(),
        expect(role('tab', { name: 'Stats' })).toExist(),
      ).pipe(Effect.provide(AppLayer)),
    )
  })

  test('clicking a post fetches its detail and renders it', async ({
    models: { loadedPostsModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(loadedPostsModel),
        click(role('button', { name: /First Post/ })),
        expect(text('Loading post…')).toExist(),
        Command.expectExact(postQuery.Fetch),
        Command.resolve(
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
        inside(
          role('article'),
          expect(text('By Grace Hopper')).toExist(),
          expect(text('The whole body of the first fixture post.')).toExist(),
        ),
        expect(role('button', { name: 'Back to posts' })).toExist(),
      ).pipe(Effect.provide(AppLayer)),
    )
  })

  test('opening a cached post skips the fetch', async ({
    models: { cachedFirstPostModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(cachedFirstPostModel),
        expect(text('Cached')).toExist(),
        click(role('button', { name: /First Post/ })),
        Command.expectNone(),
        expect(text('By Grace Hopper')).toExist(),
      ).pipe(Effect.provide(AppLayer)),
    )
  })

  test('a failed post fetch shows the error with a Retry button', async ({
    models: { loadedPostsModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(loadedPostsModel),
        click(role('button', { name: /First Post/ })),
        Command.resolve(
          postQuery.Fetch,
          postQuery.Message.CompletedFetch({
            args: { postId: 'first-post' },
            generation: FIRST_REQUEST_GENERATION,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.fail('The connection dropped.'),
          }),
        ),
        expect(text('The connection dropped.')).toExist(),
        expect(role('button', { name: 'Retry' })).toExist(),
      ).pipe(Effect.provide(AppLayer)),
    )
  })

  test('switching to the Stats tab fetches and renders stats', async ({
    models: { loadedPostsModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(loadedPostsModel),
        click(role('tab', { name: 'Stats' })),
        expect(text('Loading stats…')).toExist(),
        resolveFocusTab,
        Command.expectExact(statsQuery.Fetch),
        Command.resolve(
          statsQuery.Fetch,
          statsQuery.Message.CompletedFetch({
            generation: FIRST_REQUEST_GENERATION,
            result: Result.succeed({
              stats: fixtureStats,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ),
        expect(text('Active users')).toExist(),
        expect(text('97%')).toExist(),
        expect(text('Updated at', { exact: false })).toExist(),
      ).pipe(Effect.provide(AppLayer)),
    )
  })
})
