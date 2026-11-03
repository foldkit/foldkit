import { Effect } from 'effect'
import assert from 'node:assert/strict'

import { ApplicationBlock } from './app/block.js'
import { InMessage, Message } from './app/definition.js'

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const app = yield* ApplicationBlock.get
      const model = app.init().model
      const next = app.inMessageUpdate(
        model,
        InMessage.RequestedSet({ value: 2 }),
      ).model
      assert.equal(next.count, 4)
      assert.equal(next.editor.text, 'connected')
      assert.deepEqual(next.snapshots, [0, 0])
      assert.equal(app.update(model, Message.ClickedIncrement()).model.count, 1)
    }),
  ).pipe(Effect.provide(ApplicationBlock.layer)),
)
