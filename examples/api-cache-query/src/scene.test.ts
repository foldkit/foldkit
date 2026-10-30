import { Result } from 'effect'
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

import { describe, it } from '@effect/vitest'
import * as Tabs from '@foldkit/ui/tabs'

import { AppTabs, ApplicationLive } from './application'
import {
  FETCHED_AT,
  FIRST_POST_REQUEST_KEY,
  cachedFirstPostModel,
  firstPostDetail,
  fixtureStats,
  loadedPostsModel,
  loadingPostsModel,
} from './application.fixture'
import { PostQuery } from './postsTab'
import { StatsQuery } from './statsTab'

const FIRST_REQUEST_GENERATION = 1

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  AppTabs.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect('the posts tab renders its loading state and navigation', () =>
    scene(
      ApplicationLive,
      given(loadingPostsModel),
      expect(text('Loading posts…')).toExist(),
      expect(role('button', { name: 'Refresh' })).toExist(),
      expect(role('tab', { name: 'Posts' })).toExist(),
      expect(role('tab', { name: 'Stats' })).toExist(),
    ),
  )

  it.effect('clicking a post fetches its detail and renders it', () =>
    scene(
      ApplicationLive,
      given(loadedPostsModel),
      click(role('button', { name: /First Post/ })),
      expect(text('Loading post…')).toExist(),
      Command.expectExact(PostQuery.Fetch),
      Command.resolve(
        PostQuery.Fetch,
        PostQuery.Message.CompletedFetch({
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

  it.effect('opening a cached post skips the fetch', () =>
    scene(
      ApplicationLive,
      given(cachedFirstPostModel),
      expect(text('Cached')).toExist(),
      click(role('button', { name: /First Post/ })),
      Command.expectNone(),
      expect(text('By Grace Hopper')).toExist(),
    ),
  )

  it.effect('a failed post fetch shows the error with a Retry button', () =>
    scene(
      ApplicationLive,
      given(loadedPostsModel),
      click(role('button', { name: /First Post/ })),
      Command.resolve(
        PostQuery.Fetch,
        PostQuery.Message.CompletedFetch({
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

  it.effect('switching to the Stats tab fetches and renders stats', () =>
    scene(
      ApplicationLive,
      given(loadedPostsModel),
      click(role('tab', { name: 'Stats' })),
      expect(text('Loading stats…')).toExist(),
      resolveFocusTab,
      Command.expectExact(StatsQuery.Fetch),
      Command.resolve(
        StatsQuery.Fetch,
        StatsQuery.Message.CompletedFetch({
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
