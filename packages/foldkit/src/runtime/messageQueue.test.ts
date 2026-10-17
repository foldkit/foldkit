import { Effect } from 'effect'
import { expect, it } from 'vitest'

import { makeMessageQueue } from './messageQueue.js'
import { makeRuntimeStatus } from './runtimeStatus.js'

it('checks occurrence validity when buffered Messages reach update', async () => {
  const processed: Array<string> = []
  let isCurrent = true
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const queue = yield* makeMessageQueue<string>({
          status: makeRuntimeStatus(),
          processMessage: message => {
            processed.push(message)
          },
          crashWith: () => Effect.void,
        })
        queue.enqueueMessage('removed occurrence', () => isCurrent)
        queue.enqueueMessage('root Message')
        isCurrent = false
        queue.completeBoot()
        expect(processed).toEqual(['root Message'])
        queue.enqueueMessage('stale after boot', () => isCurrent)
        expect(processed).toEqual(['root Message'])
      }),
    ),
  )
})
