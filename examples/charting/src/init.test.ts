import { Command, init, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'
import { FetchTelemetry } from './command'
import { Message } from './message'
import { sampleTelemetry } from './model.fixture'

it.effect('seeds loading state and queues a telemetry fetch', () =>
  story(
    { block: ApplicationBlock, layer },
    init(),
    model(model => {
      expect(model.telemetry._tag).toBe('Loading')
    }),
    Command.expectHas(FetchTelemetry),
    Command.resolve(
      FetchTelemetry,
      Message.SucceededFetchTelemetry({ telemetry: sampleTelemetry }),
    ),
  ),
)
