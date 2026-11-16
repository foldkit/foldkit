import { Effect, Schema } from 'effect'
import { Mount } from 'foldkit'
import * as Scene from 'foldkit/scene'

const ContainKeyboardEvents = Mount.define('ContainKeyboardEvents', {
  messages: [Schema.Never],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const stopPropagation = (event: Event) => event.stopPropagation()
        element.addEventListener('keydown', stopPropagation)
        return stopPropagation
      }),
      stopPropagation =>
        Effect.sync(() =>
          element.removeEventListener('keydown', stopPropagation),
        ),
    ).pipe(Effect.andThen(Effect.never)),
})

Scene.Mount.acknowledge(ContainKeyboardEvents)
