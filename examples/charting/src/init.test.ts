import { Array } from 'effect'
import { expect, test } from 'vitest'

import { FetchTelemetry } from './command'
import { init } from './init'

test('seeds loading state and queues a telemetry fetch', () => {
  const init_ = init()

  expect(init_.model.telemetry._tag).toBe('Loading')
  expect(
    Array.some(
      init_.commands ?? [],
      command => command.name === FetchTelemetry.name,
    ),
  ).toBe(true)
})
