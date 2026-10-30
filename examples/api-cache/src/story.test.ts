import { Result } from 'effect'
import { Block } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { expect, it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { ApplicationLive, ApplicationTabs, Message } from './application'
import {
  FETCHED_AT,
  fixtureStats,
  loadedPostsModel,
  loadedStatsModel,
} from './application.fixture'
import { FetchStats, StatsData, StatsTab } from './statsTab'

const selectedPostsTab = Block.deliver(
  ApplicationTabs,
  'tabs',
  ApplicationTabs.Message.SelectedTab({ index: 0, value: 'Posts' }),
)

const selectedStatsTab = Block.deliver(
  ApplicationTabs,
  'tabs',
  ApplicationTabs.Message.SelectedTab({ index: 1, value: 'Stats' }),
)

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  ApplicationTabs.Message.CompletedFocusTab(),
)

it.effect('first visit to the Stats tab fetches stats', () =>
  story(
    ApplicationLive,
    given(loadedPostsModel),
    message(selectedStatsTab),
    model(model => {
      expect(model.activeTab).toBe('Stats')
      expect(model.statsTab.stats._tag).toBe('Loading')
    }),
    resolveFocusTab,
    Command.resolve(
      FetchStats,
      StatsTab.Message.CompletedFetchStats({
        result: Result.succeed({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
      }),
    ),
    model(model => {
      expect(model.statsTab.stats._tag).toBe('Success')
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
      expect(model.statsTab.stats._tag).toBe('Success')
    }),
  ),
)

it.effect(
  'a revalidation tick keeps stale stats on screen while refetching',
  () =>
    story(
      ApplicationLive,
      given(loadedStatsModel),
      message(Message.TickedRevalidateStats()),
      model(({ statsTab: { stats } }) => {
        expect(stats._tag).toBe('Refreshing')
        if (stats._tag === 'Refreshing') {
          expect(stats.data.stats).toEqual(fixtureStats)
        }
      }),
      Command.resolve(
        FetchStats,
        StatsTab.Message.CompletedFetchStats({
          result: Result.succeed({
            stats: modifyFields(fixtureStats, { activeUsers: () => 99 }),
            fetchedAt: FETCHED_AT + 5000,
          }),
        }),
      ),
      model(({ statsTab: { stats } }) => {
        expect(stats._tag).toBe('Success')
        if (stats._tag === 'Success') {
          expect(stats.data.stats.activeUsers).toBe(99)
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
      message(Message.TickedRevalidateStats()),
      Command.resolve(
        FetchStats,
        StatsTab.Message.CompletedFetchStats({
          result: Result.fail('The server is down.'),
        }),
      ),
      model(({ statsTab: { stats } }) => {
        expect(stats._tag).toBe('Stale')
        if (stats._tag === 'Stale') {
          expect(stats.data.stats).toEqual(fixtureStats)
          expect(stats.error).toBe('The server is down.')
        }
      }),
    ),
)

it.effect('a revalidation tick during a refresh is deduplicated', () =>
  story(
    ApplicationLive,
    given(
      modifyFields(loadedStatsModel, {
        statsTab: () => ({
          stats: StatsData.Refreshing({
            data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
          }),
        }),
      }),
    ),
    message(Message.TickedRevalidateStats()),
    Command.expectNone(),
  ),
)
