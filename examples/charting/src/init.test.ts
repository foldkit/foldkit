import { Array, Effect } from 'effect'
import { withBlock } from 'foldkit/story'
import { expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { FetchTelemetry } from './command'

test('seeds loading state and queues a telemetry fetch', async () => {
  await Effect.runPromise(
    withBlock(ApplicationBlock, application => {
      const init_ = application.init()

      expect(init_.model.telemetry._tag).toBe('Loading')
      expect(
        Array.some(
          init_.commands ?? [],
          command => command.name === FetchTelemetry.name,
        ),
      ).toBe(true)
    }),
  )
})
