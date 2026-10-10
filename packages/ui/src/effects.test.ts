import { Effect, Layer } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { EffectsLayer } from './effects.js'

describe('EffectsLayer', () => {
  it('is inert while the application Layer is assembled', async () => {
    const addEventListener = vi.spyOn(EventTarget.prototype, 'addEventListener')
    const requestAnimationFrame = vi.spyOn(globalThis, 'requestAnimationFrame')
    const styleCount = document.head.querySelectorAll('style').length
    const overflow = document.documentElement.style.overflow

    try {
      await Effect.runPromise(Effect.scoped(Layer.build(EffectsLayer)))

      expect(addEventListener).not.toHaveBeenCalled()
      expect(requestAnimationFrame).not.toHaveBeenCalled()
      expect(document.head.querySelectorAll('style')).toHaveLength(styleCount)
      expect(document.documentElement.style.overflow).toBe(overflow)
    } finally {
      addEventListener.mockRestore()
      requestAnimationFrame.mockRestore()
    }
  })
})
