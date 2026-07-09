import { describe, expect, it } from 'vitest'

import plugin from '../src/index.ts'

const testFilePatterns = ['**/*.test.ts', '**/*.test.tsx']

const presets = [
  { name: 'recommended', config: plugin.configs.recommended },
  { name: 'all', config: plugin.configs.all },
]

describe('configs', () => {
  for (const { name, config } of presets) {
    describe(name, () => {
      it('enables foldkit rules at error severity', () => {
        expect(
          config.rules['foldkit/no-child-message-construction-in-root'],
        ).toBe('error')
        expect(config.rules['foldkit/no-noop-message']).toBe('error')
        expect(config.rules['foldkit/message-binding-matches-tag']).toBe(
          'error',
        )
      })

      it('turns every foldkit rule off in test files', () => {
        expect(config.overrides).toBeInstanceOf(Array)
        expect(config.overrides).toHaveLength(1)

        const override = config.overrides[0]
        expect(override?.files).toEqual(testFilePatterns)

        for (const ruleId of Object.keys(config.rules)) {
          expect(override?.rules[ruleId]).toBe('off')
        }
      })
    })
  }
})
