import { Effect, Stream } from 'effect'
import { Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Editor } from '@tiptap/core'

const Message = defineMessageUnion({
  CompletedMountEditor: {},
})

const MountEditor = Mount.define('MountEditor', {
  messages: [Message.CompletedMountEditor],
  execute: ({ element, viewStateChanges }) =>
    Effect.gen(function* () {
      const editor = yield* Effect.acquireRelease(
        Effect.sync(() => new Editor({ element })),
        mountedEditor => Effect.sync(() => mountedEditor.destroy()),
      )

      yield* viewStateChanges.pipe(
        Stream.runForEach(viewState =>
          Effect.sync(() => editor.setEditable(viewState === 'Live')),
        ),
        Effect.forkScoped,
      )

      return Message.CompletedMountEditor()
    }),
})
