import { Result } from 'effect'
import { Block } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'
import * as Tabs from '@foldkit/ui/tabs'

import { AppTabs, ApplicationLive, Message } from './application'
import {
  FETCHED_AT,
  fixtureStats,
  loadedPostsModel,
  loadedStatsModel,
  refreshingStatsModel,
} from './application.fixture'
import { StatsQuery } from './statsTab'

const FIRST_REQUEST_GENERATION = 1
const SECOND_REQUEST_GENERATION = 2

const selectedPostsTab = Block.deliver(
  AppTabs,
  'tabs',
  AppTabs.Message.SelectedTab({ index: 0, value: 'Posts' }),
)

const selectedStatsTab = Block.deliver(
  AppTabs,
  'tabs',
  AppTabs.Message.SelectedTab({ index: 1, value: 'Stats' }),
)

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  AppTabs.Message.CompletedFocusTab(),
)

describe('update', () => {
  it.effect('first visit to the Stats tab fetches stats', () =>
    story(
      ApplicationLive,
      given(loadedPostsModel),
      message(selectedStatsTab),
      model(model => {
        expect(model.activeTab).toBe('Stats')
        expect(StatsQuery.read(model.statsTab.stats)._tag).toBe('Loading')
      }),
      resolveFocusTab,
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
      model(model => {
        expect(StatsQuery.read(model.statsTab.stats)._tag).toBe('Success')
      }),
    ),
  )

  it.effect('returning to a tab with cached data does not refetch', () =>
    story(
      ApplicationLive,
      given(loadedStatsModel),
      message(selectedPostsTab),
      resolveFocusTab,
      Command.expectNone(),
      message(selectedStatsTab),
      resolveFocusTab,
      Command.expectNone(),
      model(model => {
        expect(StatsQuery.read(model.statsTab.stats)._tag).toBe('Success')
      }),
    ),
  )

  it.effect(
    'a revalidation tick keeps stale stats on screen while refetching',
    () =>
      story(
        ApplicationLive,
        given(loadedStatsModel),
        message(Message.TickedStatsRefreshInterval()),
        model(model => {
          const statsAsyncData = StatsQuery.read(model.statsTab.stats)
          expect(statsAsyncData._tag).toBe('Refreshing')
          if (statsAsyncData._tag === 'Refreshing') {
            expect(statsAsyncData.data.stats).toEqual(fixtureStats)
          }
        }),
        Command.resolve(
          StatsQuery.Fetch,
          StatsQuery.Message.CompletedFetch({
            generation: SECOND_REQUEST_GENERATION,
            result: Result.succeed({
              stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
              fetchedAt: FETCHED_AT + 5000,
            }),
          }),
        ),
        model(model => {
          const statsAsyncData = StatsQuery.read(model.statsTab.stats)
          expect(statsAsyncData._tag).toBe('Success')
          if (statsAsyncData._tag === 'Success') {
            expect(statsAsyncData.data.stats.activeUsers).toBe(99)
          }
        }),
      ),
  )

  it.effect(
    'a failed refresh keeps the stale stats on screen with the error',
    () =>
      story(
        ApplicationLive,
        given(loadedStatsModel),
        message(Message.TickedStatsRefreshInterval()),
        Command.resolve(
          StatsQuery.Fetch,
          StatsQuery.Message.CompletedFetch({
            generation: SECOND_REQUEST_GENERATION,
            result: Result.fail('The server is down.'),
          }),
        ),
        model(model => {
          const statsAsyncData = StatsQuery.read(model.statsTab.stats)
          expect(statsAsyncData._tag).toBe('Stale')
          if (statsAsyncData._tag === 'Stale') {
            expect(statsAsyncData.data.stats).toEqual(fixtureStats)
            expect(statsAsyncData.error).toBe('The server is down.')
          }
        }),
      ),
  )

  it.effect('a revalidation tick during a refresh is deduplicated', () =>
    story(
      ApplicationLive,
      given(refreshingStatsModel),
      message(Message.TickedStatsRefreshInterval()),
      Command.expectNone(),
    ),
  )
})
