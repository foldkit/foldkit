import { Effect, Option, Stream } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { AnchorPopover, Message } from './index.js'

describe('AnchorPopover Mount', () => {
  it.effect('positions the panel before acknowledging the Mount', () => {
    const button = document.createElement('button')
    button.id = 'popover-anchor-mount-trigger'
    const panel = document.createElement('div')
    document.body.append(button, panel)

    const mount = AnchorPopover({ buttonId: button.id, anchor: {} })

    return Effect.gen(function* () {
      const result = yield* Stream.runHead(mount.f(panel, Stream.make('Live')))

      expect(result).toEqual(Option.some(Message.CompletedAnchorPopover()))
      expect(document.getElementById('foldkit-portal-root')).not.toBeNull()
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          button.remove()
          panel.remove()
          document.getElementById('foldkit-portal-root')?.remove()
        }),
      ),
    )
  })
})
