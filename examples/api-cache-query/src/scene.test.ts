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

import { test as TabsTest } from '@foldkit/ui/tabs'

import { ApplicationBlock } from './block'
import { AppLayer } from './layer'
import { AppTabsBlock } from './model'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  firstPostDetail,
  fixtureStats,
  it,
} from './model.fixture'
import { postQuery, statsQuery } from './query'

const FIRST_REQUEST_GENERATION = 1

const resolveFocusTab = Command.resolve(
  TabsTest.FocusTab,
  AppTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect(
    'the posts tab renders its loading state and navigation',
    ({ models: { loadingPostsModel } }) =>
      scene(
        ApplicationBlock,
        given(loadingPostsModel),
        expect(text('Loading posts…')).toExist(),
        expect(role('button', { name: 'Refresh' })).toExist(),
        expect(role('tab', { name: 'Posts' })).toExist(),
        expect(role('tab', { name: 'Stats' })).toExist(),
      ).pipe(Effect.provide(AppLayer)),
  )

  it.effect(
    'clicking a post fetches its detail and renders it',
    ({ models: { loadedPostsModel } }) =>
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

  it.effect(
    'opening a cached post skips the fetch',
    ({ models: { cachedFirstPostModel } }) =>
      scene(
        ApplicationBlock,
        given(cachedFirstPostModel),
        expect(text('Cached')).toExist(),
        click(role('button', { name: /First Post/ })),
        Command.expectNone(),
        expect(text('By Grace Hopper')).toExist(),
      ).pipe(Effect.provide(AppLayer)),
  )

  it.effect(
    'a failed post fetch shows the error with a Retry button',
    ({ models: { loadedPostsModel } }) =>
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

  it.effect(
    'switching to the Stats tab fetches and renders stats',
    ({ models: { loadedPostsModel } }) =>
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
