import { evo } from 'foldkit/struct'
import { describe, expect, test, vi } from 'vitest'

import { Message, type Model, handleSlow } from './main'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('handleSlow', () => {
  test('logs the warning to the console', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      handleSlow({
        _tag: 'Update',
        durationMs: 12,
        thresholdMs: 4,
        previousModel: initialModel,
        nextModel: evo(initialModel, {
          activeWorkload: () => 'Update',
        }),
        message: Message.ClickedRunUpdateWork(),
      })

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[foldkit] Slow update: 12.0ms'),
        expect.objectContaining({
          _tag: 'Update',
          durationMs: 12,
          thresholdMs: 4,
        }),
        expect.objectContaining({ _tag: 'ClickedRunUpdateWork' }),
      )
    } finally {
      consoleWarn.mockRestore()
    }
  })
})
