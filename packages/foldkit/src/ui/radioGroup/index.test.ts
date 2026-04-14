import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Story from '../../test/story.js'
import {
  CompletedFocusOption,
  FocusOption,
  SelectedOption,
  init,
  update,
} from './index.js'

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
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(SelectedOption({ value: 'startup', index: 0 })),
        Story.resolve(FocusOption, CompletedFocusOption()),
        Story.model(model => {
          expect(model.selectedValue).toStrictEqual(Option.some('startup'))
        }),
      )
    })

    it('replaces selectedValue on subsequent SelectedOption', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', selectedValue: 'startup' })),
        Story.message(SelectedOption({ value: 'enterprise', index: 2 })),
        Story.resolve(FocusOption, CompletedFocusOption()),
        Story.model(model => {
          expect(model.selectedValue).toStrictEqual(Option.some('enterprise'))
        }),
      )
    })

    it('preserves other model fields on SelectedOption', () => {
      Story.story(
        update,
        Story.with(
          init({
            id: 'test',
            orientation: 'Horizontal',
          }),
        ),
        Story.message(SelectedOption({ value: 'startup', index: 0 })),
        Story.resolve(FocusOption, CompletedFocusOption()),
        Story.model(model => {
          expect(model.id).toBe('test')
          expect(model.orientation).toBe('Horizontal')
        }),
      )
    })

    it('returns same model reference on CompletedFocusOption', () => {
      const originalModel = init({ id: 'test' })
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(CompletedFocusOption()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })
  })
})
