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
import { describe } from 'vitest'

import { test as TabsTest } from '@foldkit/ui/tabs'

import { FetchPostDetail, FetchStats } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { ApplicationTabsBlock } from './model'
import { FETCHED_AT, firstPostDetail, fixtureStats, it } from './model.fixture'

const resolveFocusTab = Command.resolve(
  TabsTest.FocusTab,
  ApplicationTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect(
    'posts load into clickable rows with an Invalidate button',
    ({ models: { loadingPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(loadingPostsModel),
        expect(text('Loading posts...')).toExist(),
        expect(role('button', { name: 'Invalidate' })).toExist(),
        expect(role('tab', { name: 'Posts' })).toExist(),
        expect(role('tab', { name: 'Stats' })).toExist(),
      ),
  )

  it.effect(
    'clicking a post fetches its detail and renders it',
    ({ models: { loadedPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
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
      ),
  )

  it.effect(
    'a cached post shows the Cached badge and revisits skip the fetch',
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
    'a failed detail fetch shows the error with a Retry button',
    ({ models: { loadedPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
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
      ),
  )

  it.effect(
    'switching to the Stats tab fetches and renders stats',
    ({ models: { loadedPostsModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
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
      ),
  )
})
