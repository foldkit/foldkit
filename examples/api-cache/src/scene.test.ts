import { Result } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import {
  FetchPostDetail,
  FetchStats,
  SettledFetchPostDetail,
  SettledFetchStats,
  update,
  view,
} from './main'
import {
  FETCHED_AT,
  cachedFirstPostModel,
  firstPostDetail,
  fixtureStats,
  loadedPostsModel,
  loadingPostsModel,
} from './main.fixtures'

const resolveFocusTab = Scene.Command.resolve(
  Tabs.FocusTab,
  Tabs.CompletedFocusTab(),
)

describe('view', () => {
  test('posts load into clickable rows with an Invalidate button', () => {
    Scene.scene(
      { update, view },
      Scene.with(loadingPostsModel),
      Scene.expect(Scene.text('Loading posts...')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Invalidate' })).toExist(),
      Scene.expect(Scene.role('tab', { name: 'Posts' })).toExist(),
      Scene.expect(Scene.role('tab', { name: 'Stats' })).toExist(),
    )
  })

  test('clicking a post fetches its detail and renders it', () => {
    Scene.scene(
      { update, view },
      Scene.with(loadedPostsModel),
      Scene.click(Scene.role('button', { name: /First Post/ })),
      Scene.expect(Scene.text('Loading post...')).toExist(),
      Scene.Command.expectExact(FetchPostDetail({ postId: 'first-post' })),
      Scene.Command.resolve(
        FetchPostDetail,
        SettledFetchPostDetail({
          postId: 'first-post',
          result: Result.succeed({
            detail: firstPostDetail,
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
  })

  test('a cached post shows the Cached badge and revisits skip the fetch', () => {
    Scene.scene(
      { update, view },
      Scene.with(cachedFirstPostModel),
      Scene.expect(Scene.text('Cached')).toExist(),
      Scene.click(Scene.role('button', { name: /First Post/ })),
      Scene.Command.expectNone(),
      Scene.expect(Scene.text('By Grace Hopper')).toExist(),
    )
  })

  test('a failed detail fetch shows the error with a Retry button', () => {
    Scene.scene(
      { update, view },
      Scene.with(loadedPostsModel),
      Scene.click(Scene.role('button', { name: /First Post/ })),
      Scene.Command.resolve(
        FetchPostDetail,
        SettledFetchPostDetail({
          postId: 'first-post',
          result: Result.fail('The connection dropped.'),
        }),
      ),
      Scene.expect(Scene.text('The connection dropped.')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Retry' })).toExist(),
    )
  })

  test('switching to the Stats tab fetches and renders stats', () => {
    Scene.scene(
      { update, view },
      Scene.with(loadedPostsModel),
      Scene.click(Scene.role('tab', { name: 'Stats' })),
      Scene.expect(Scene.text('Loading stats...')).toExist(),
      resolveFocusTab,
      Scene.Command.expectExact(FetchStats()),
      Scene.Command.resolve(
        FetchStats,
        SettledFetchStats({
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
  })
})
