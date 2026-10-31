import { Command, given, message, story } from 'foldkit/story'

import { it } from '@effect/vitest'

import { StatsData, StatsTab, StatsTabLive } from './statsTab'

it.effect('refresh clicks during an in-flight fetch are deduplicated', () =>
  story(
    StatsTabLive,
    given({ stats: StatsData.Loading() }),
    message(StatsTab.Message.ClickedRefreshStats()),
    Command.expectNone(),
  ),
)
