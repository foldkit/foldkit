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
import { FetchPostDetail, FetchStats } from './command'
import { AppLayer } from './layer'
import { Message } from './message'
import { ApplicationTabsBlock } from './model'
import {
  FETCHED_AT,
  firstPostDetail,
  fixtureStats,
  test,
} from './model.fixture'

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  ApplicationTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  test('posts load into clickable rows with an Invalidate button', async ({
    models: { loadingPostsModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(loadingPostsModel),
        expect(text('Loading posts...')).toExist(),
        expect(role('button', { name: 'Invalidate' })).toExist(),
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
        expect(text('Loading post...')).toExist(),
        Command.expectExact(FetchPostDetail({ postId: 'first-post' })),
        Command.resolve(
          FetchPostDetail,
          Message.CompletedFetchPostDetail({
            postId: 'first-post',
            result: Result.succeed({
              detail: firstPostDetail,
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

  test('a cached post shows the Cached badge and revisits skip the fetch', async ({
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

  test('a failed detail fetch shows the error with a Retry button', async ({
    models: { loadedPostsModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(loadedPostsModel),
        click(role('button', { name: /First Post/ })),
        Command.resolve(
          FetchPostDetail,
          Message.CompletedFetchPostDetail({
            postId: 'first-post',
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
        expect(text('Loading stats...')).toExist(),
        resolveFocusTab,
        Command.expectExact(FetchStats()),
        Command.resolve(
          FetchStats,
          Message.CompletedFetchStats({
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
