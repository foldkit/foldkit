import { Effect, Result } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { FetchPostDetail, FetchStats } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { ApplicationTabsBlock } from './model'
import {
  FETCHED_AT,
  firstPostDetail,
  fixtureEffects,
  fixtureStats,
} from './model.fixture'

const resolveFocusTab = Scene.Command.resolve(
  Tabs.test.FocusTab,
  ApplicationTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect('posts load into clickable rows with an Invalidate button', () =>
    Effect.gen(function* () {
      const loadingPostsModel = yield* fixtureEffects.loadingPostsModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(loadingPostsModel),
        Scene.expect(Scene.text('Loading posts...')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Invalidate' })).toExist(),
        Scene.expect(Scene.role('tab', { name: 'Posts' })).toExist(),
        Scene.expect(Scene.role('tab', { name: 'Stats' })).toExist(),
      )
    }),
  )

  it.effect('clicking a post fetches its detail and renders it', () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(loadedPostsModel),
        Scene.click(Scene.role('button', { name: /First Post/ })),
        Scene.expect(Scene.text('Loading post...')).toExist(),
        Scene.Command.expectExact(FetchPostDetail({ postId: 'first-post' })),
        Scene.Command.resolve(
          FetchPostDetail,
          Message.CompletedFetchPostDetail({
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
    }),
  )

  it.effect(
    'a cached post shows the Cached badge and revisits skip the fetch',
    () =>
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

  it.effect('a failed detail fetch shows the error with a Retry button', () =>
    Effect.gen(function* () {
      const loadedPostsModel = yield* fixtureEffects.loadedPostsModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(loadedPostsModel),
        Scene.click(Scene.role('button', { name: /First Post/ })),
        Scene.Command.resolve(
          FetchPostDetail,
          Message.CompletedFetchPostDetail({
            postId: 'first-post',
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
        Scene.expect(Scene.text('Loading stats...')).toExist(),
        resolveFocusTab,
        Scene.Command.expectExact(FetchStats()),
        Scene.Command.resolve(
          FetchStats,
          Message.CompletedFetchStats({
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
