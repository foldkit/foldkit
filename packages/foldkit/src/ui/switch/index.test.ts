import { describe, expect, it } from 'vitest'

import { init, NoOp, Toggled, update } from './index'

describe('Switch', () => {
  describe('init', () => {
    it('defaults isChecked to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isChecked: false,
      })
    })

    it('accepts isChecked override', () => {
      expect(init({ id: 'test', isChecked: true })).toStrictEqual({
        id: 'test',
        isChecked: true,
      })
    })
  })

  describe('update', () => {
    it('toggles from unchecked to checked on Toggled', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, Toggled())
      expect(result.isChecked).toBe(true)
      expect(commands).toHaveLength(0)
    })

    it('toggles from checked to unchecked on Toggled', () => {
      const model = init({ id: 'test', isChecked: true })
      const [result, commands] = update(model, Toggled())
      expect(result.isChecked).toBe(false)
      expect(commands).toHaveLength(0)
    })

    it('returns same model reference on NoOp', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, NoOp())
      expect(result).toBe(model)
      expect(commands).toHaveLength(0)
    })
  })
})
