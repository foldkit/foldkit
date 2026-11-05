import { Result } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  init,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { ApplicationBlock, layer } from './index'
import { AppTabsBlock } from './model'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  firstPostDetail,
  fixtureStats,
  it,
} from './model.fixture'
import { postQuery, postsQuery, statsQuery } from './query'

const FIRST_REQUEST_GENERATION = 1

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  AppTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect('the posts tab renders its loading state and navigation', () =>
    scene(
      { block: ApplicationBlock, layer },
      init(),
      expect(text('Loading posts…')).toExist(),
      expect(role('button', { name: 'Refresh' })).toExist(),
      expect(role('tab', { name: 'Posts' })).toExist(),
      expect(role('tab', { name: 'Stats' })).toExist(),
      Command.resolve(
        postsQuery.Fetch,
        postsQuery.Message.CompletedFetch({
          generation: FIRST_REQUEST_GENERATION,
          result: Result.fail('The server is down.'),
        }),
      ),
    ),
  )

  it.effect(
    'clicking a post fetches its detail and renders it',
    ({ models: { loadedPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
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
      ),
  )

  it.effect(
    'opening a cached post skips the fetch',
    ({ models: { cachedFirstPostModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(cachedFirstPostModel),
        expect(text('Cached')).toExist(),
        click(role('button', { name: /First Post/ })),
        Command.expectNone(),
        expect(text('By Grace Hopper')).toExist(),
      ),
  )

  it.effect(
    'a failed post fetch shows the error with a Retry button',
    ({ models: { loadedPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
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
      ),
  )

  it.effect(
    'switching to the Stats tab fetches and renders stats',
    ({ models: { loadedPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
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
      ),
  )
})
