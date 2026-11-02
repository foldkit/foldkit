import { Command, given, message, story } from 'foldkit/story'

import { describe, it } from '@effect/vitest'

import { loadingStatsTabModel } from './application.fixture'
import { StatsTab, StatsTabLive } from './statsTab'

describe('update', () => {
  it.effect('refresh clicks during an in-flight fetch are deduplicated', () =>
    story(
      StatsTabLive,
      given(loadingStatsTabModel),
      message(StatsTab.Message.ClickedRefreshStats()),
      Command.expectNone(),
    ),
  )
})
