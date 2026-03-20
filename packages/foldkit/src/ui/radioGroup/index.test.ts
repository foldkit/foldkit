import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { CompletedFocusOption, SelectedOption, init, update } from './index'

describe('RadioGroup', () => {
  describe('init', () => {
    it('defaults to no selection and vertical orientation', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        selectedValue: Option.none(),
        orientation: 'Vertical',
      })
    })

    it('accepts a custom selectedValue', () => {
      expect(init({ id: 'test', selectedValue: 'business' })).toStrictEqual({
        id: 'test',
        selectedValue: Option.some('business'),
        orientation: 'Vertical',
      })
    })

    it('accepts a custom orientation', () => {
      expect(init({ id: 'test', orientation: 'Horizontal' })).toStrictEqual({
        id: 'test',
        selectedValue: Option.none(),
        orientation: 'Horizontal',
      })
    })
  })

  describe('update', () => {
    it('sets selectedValue on SelectedOption', () => {
      const model = init({ id: 'test' })
      const [result] = update(
        model,
        SelectedOption({ value: 'startup', index: 0 }),
      )
      expect(result.selectedValue).toStrictEqual(Option.some('startup'))
    })

    it('replaces selectedValue on subsequent SelectedOption', () => {
      const model = init({ id: 'test', selectedValue: 'startup' })
      const [result] = update(
        model,
        SelectedOption({ value: 'enterprise', index: 2 }),
      )
      expect(result.selectedValue).toStrictEqual(Option.some('enterprise'))
    })

    it('preserves other model fields on SelectedOption', () => {
      const model = init({
        id: 'test',
        orientation: 'Horizontal',
      })
      const [result] = update(
        model,
        SelectedOption({ value: 'startup', index: 0 }),
      )
      expect(result.id).toBe('test')
      expect(result.orientation).toBe('Horizontal')
    })

    it('returns a focus command on SelectedOption', () => {
      const model = init({ id: 'test' })
      const [, commands] = update(
        model,
        SelectedOption({ value: 'startup', index: 0 }),
      )
      expect(commands).toHaveLength(1)
    })

    it('returns same model reference on CompletedFocusOption', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, CompletedFocusOption())
      expect(result).toBe(model)
      expect(commands).toHaveLength(0)
    })
  })
})
