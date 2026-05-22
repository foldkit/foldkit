import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import * as Story from '../../test/story.js'
import {
  CompletedFocusTab,
  FocusTab,
  TabFocused,
  TabSelected,
  findFirstEnabledIndex,
  init,
  keyToIndex,
  update,
  wrapIndex,
} from './index.js'

const noneDisabled = () => false

const disabledAt =
  (...indices: ReadonlyArray<number>) =>
  (index: number) =>
    indices.includes(index)

describe('Tabs', () => {
  describe('init', () => {
    it('defaults activeIndex to 0 and automatic activation', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        activeIndex: 0,
        focusedIndex: 0,
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom activeIndex', () => {
      expect(init({ id: 'test', activeIndex: 2 })).toStrictEqual({
        id: 'test',
        activeIndex: 2,
        focusedIndex: 2,
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom activationMode', () => {
      expect(init({ id: 'test', activationMode: 'Manual' })).toStrictEqual({
        id: 'test',
        activeIndex: 0,
        focusedIndex: 0,
        activationMode: 'Manual',
      })
    })

    it('syncs focusedIndex with activeIndex', () => {
      const model = init({ id: 'test', activeIndex: 3 })
      expect(model.focusedIndex).toBe(3)
    })
  })

  describe('update', () => {
    it('sets activeIndex and focusedIndex on TabSelected', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(TabSelected({ index: 3 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.activeIndex).toBe(3)
          expect(model.focusedIndex).toBe(3)
        }),
      )
    })

    it('replaces activeIndex on subsequent TabSelected', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', activeIndex: 1 })),
        Story.message(TabSelected({ index: 0 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.activeIndex).toBe(0)
          expect(model.focusedIndex).toBe(0)
        }),
      )
    })

    it('updates only focusedIndex on TabFocused', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', activationMode: 'Manual' })),
        Story.message(TabFocused({ index: 2 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.activeIndex).toBe(0)
          expect(model.focusedIndex).toBe(2)
        }),
      )
    })

    it('does not change activeIndex on TabFocused', () => {
      Story.story(
        update,
        Story.with(
          init({
            id: 'test',
            activeIndex: 1,
            activationMode: 'Manual',
          }),
        ),
        Story.message(TabFocused({ index: 3 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.activeIndex).toBe(1)
          expect(model.focusedIndex).toBe(3)
        }),
      )
    })

    it('TabSelected updates both indices in manual mode', () => {
      Story.story(
        update,
        Story.with({
          ...init({ id: 'test', activationMode: 'Manual' }),
          focusedIndex: 2,
        }),
        Story.message(TabSelected({ index: 2 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.activeIndex).toBe(2)
          expect(model.focusedIndex).toBe(2)
        }),
      )
    })
  })

  describe('wrapIndex', () => {
    it('returns the index when within range', () => {
      expect(wrapIndex(2, 5)).toBe(2)
    })

    it('wraps positive overflow', () => {
      expect(wrapIndex(5, 5)).toBe(0)
      expect(wrapIndex(7, 5)).toBe(2)
    })

    it('wraps negative index', () => {
      expect(wrapIndex(-1, 5)).toBe(4)
      expect(wrapIndex(-3, 5)).toBe(2)
    })

    it('handles boundary indices', () => {
      expect(wrapIndex(0, 5)).toBe(0)
      expect(wrapIndex(4, 5)).toBe(4)
    })
  })

  describe('findFirstEnabledIndex', () => {
    it('returns startIndex when not disabled', () => {
      const find = findFirstEnabledIndex(5, 0, noneDisabled)
      expect(find(2, 1)).toBe(2)
    })

    it('skips disabled tabs scanning forward', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(1, 2))
      expect(find(1, 1)).toBe(3)
    })

    it('skips disabled tabs scanning backward', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(3, 2))
      expect(find(3, -1)).toBe(1)
    })

    it('wraps around to find an enabled tab', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(3, 4))
      expect(find(3, 1)).toBe(0)
    })

    it('returns focusedIndex when all tabs are disabled', () => {
      const allDisabled = () => true
      const find = findFirstEnabledIndex(3, 1, allDisabled)
      expect(find(0, 1)).toBe(1)
    })

    it('finds last enabled tab scanning backward from end', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(4))
      expect(find(4, -1)).toBe(3)
    })

    it('skips a contiguous run of disabled tabs', () => {
      const find = findFirstEnabledIndex(6, 0, disabledAt(1, 2, 3))
      expect(find(1, 1)).toBe(4)
    })
  })

  describe('keyToIndex', () => {
    it('moves to next tab on next key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, noneDisabled)
      expect(resolve('ArrowRight')).toBe(1)
    })

    it('moves to previous tab on previous key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 2, noneDisabled)
      expect(resolve('ArrowLeft')).toBe(1)
    })

    it('wraps from last to first on next key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 3, 2, noneDisabled)
      expect(resolve('ArrowRight')).toBe(0)
    })

    it('wraps from first to last on previous key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 3, 0, noneDisabled)
      expect(resolve('ArrowLeft')).toBe(2)
    })

    it('jumps to first enabled tab on Home', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 3, disabledAt(0))
      expect(resolve('Home')).toBe(1)
    })

    it('jumps to first enabled tab on PageUp', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 3, disabledAt(0))
      expect(resolve('PageUp')).toBe(1)
    })

    it('jumps to last enabled tab on End', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, disabledAt(4))
      expect(resolve('End')).toBe(3)
    })

    it('jumps to last enabled tab on PageDown', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, disabledAt(4))
      expect(resolve('PageDown')).toBe(3)
    })

    it('returns focusedIndex for unrecognized key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 2, noneDisabled)
      expect(resolve('Tab')).toBe(2)
    })

    it('works with vertical orientation keys', () => {
      const resolve = keyToIndex('ArrowDown', 'ArrowUp', 3, 0, noneDisabled)
      expect(resolve('ArrowDown')).toBe(1)
      expect(resolve('ArrowUp')).toBe(2)
    })

    it('skips disabled tabs during arrow navigation', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, disabledAt(1))
      expect(resolve('ArrowRight')).toBe(2)
    })
  })
})
