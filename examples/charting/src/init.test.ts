import { Array } from 'effect'
import { expect, test } from 'vitest'

import { FetchTelemetry } from './command'
import { init } from './init'

test('seeds loading state and queues a telemetry fetch', () => {
  const [model, commands] = init()

  expect(model.telemetry._tag).toBe('TelemetryLoading')
  expect(
    Array.some(commands, command => command.name === FetchTelemetry.name),
  ).toBe(true)
})
