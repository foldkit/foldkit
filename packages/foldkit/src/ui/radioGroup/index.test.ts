import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Test from '../../test'
import {
  CompletedFocusOption,
  FocusOption,
  SelectedOption,
  init,
  update,
} from './index'

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
      Test.story(
        update,
        Test.with(init({ id: 'test' })),
        Test.message(SelectedOption({ value: 'startup', index: 0 })),
        Test.resolve(FocusOption, CompletedFocusOption()),
        Test.tap(({ model }) => {
          expect(model.selectedValue).toStrictEqual(Option.some('startup'))
        }),
      )
    })

    it('replaces selectedValue on subsequent SelectedOption', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test', selectedValue: 'startup' })),
        Test.message(SelectedOption({ value: 'enterprise', index: 2 })),
        Test.resolve(FocusOption, CompletedFocusOption()),
        Test.tap(({ model }) => {
          expect(model.selectedValue).toStrictEqual(Option.some('enterprise'))
        }),
      )
    })

    it('preserves other model fields on SelectedOption', () => {
      Test.story(
        update,
        Test.with(
          init({
            id: 'test',
            orientation: 'Horizontal',
          }),
        ),
        Test.message(SelectedOption({ value: 'startup', index: 0 })),
        Test.resolve(FocusOption, CompletedFocusOption()),
        Test.tap(({ model }) => {
          expect(model.id).toBe('test')
          expect(model.orientation).toBe('Horizontal')
        }),
      )
    })

    it('returns same model reference on CompletedFocusOption', () => {
      const originalModel = init({ id: 'test' })
      Test.story(
        update,
        Test.with(originalModel),
        Test.message(CompletedFocusOption()),
        Test.tap(({ model }) => {
          expect(model).toBe(originalModel)
        }),
      )
    })
  })
})
