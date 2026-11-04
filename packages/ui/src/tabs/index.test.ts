import { Array, Effect, Option, pipe } from 'effect'
import { Scene, Story } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'
import { it as baseIt, expect } from 'vitest'

import { describe, makeMethods } from '@effect/vitest'

import {
  FocusTab,
  Message,
  OutMessage,
  block,
  findFirstEnabledIndex,
  keyToIndex,
  wrapIndex,
} from './tabs.js'

const noneDisabled = () => false

const disabledAt =
  (...indices: ReadonlyArray<number>) =>
  (index: number) =>
    indices.includes(index)

type TabsOperations = Pick<Story.TestBlock<typeof block>, 'init' | 'update'>
const makeFixture = ({ init, update }: TabsOperations) => ({ init, update })
const it = makeMethods(
  baseIt.extend<{ tabs: TabsOperations }>({
    tabs: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(block, tabs =>
          Effect.promise(() => use(makeFixture(tabs))),
        ),
      ),
  }),
)

describe('Tabs', () => {
  describe('view', () => {
    it.effect(
      'only gives the mounted panel relationship to the active tab',
      () =>
        Scene.scene(
          {
            block,
            viewInputs: {
              tabs: ['First', 'Second'],
              selectedValue: 'First',
              ariaLabel: 'Test tabs',
              toView: ({ tablist, tabs, activeIndex }) =>
                ih.div(
                  [],
                  [
                    ih.div(
                      tablist,
                      Array.map(tabs, tab => ih.button(tab.tab, [tab.value])),
                    ),
                    pipe(
                      tabs,
                      Array.get(activeIndex),
                      Option.match({
                        onNone: () => ih.empty,
                        onSome: tab => ih.div(tab.panel),
                      }),
                    ),
                  ],
                ),
            },
          },
          Scene.init({ id: 'test' }),
          Scene.expect(Scene.selector('#test-tab-0')).toHaveAttr(
            'aria-controls',
            'test-panel-0',
          ),
          Scene.expect(Scene.selector('#test-tab-1')).not.toHaveAttr(
            'aria-controls',
          ),
        ),
    )

    it.effect(
      'keeps every panel relationship when all panels remain mounted',
      () =>
        Scene.scene(
          {
            block,
            viewInputs: {
              tabs: ['First', 'Second'],
              selectedValue: 'First',
              ariaLabel: 'Test tabs',
              panelMount: 'All',
              toView: ({ tablist, tabs }) =>
                ih.div(
                  [],
                  [
                    ih.div(
                      tablist,
                      Array.map(tabs, tab => ih.button(tab.tab, [tab.value])),
                    ),
                    ...Array.map(tabs, tab => ih.div(tab.panel)),
                  ],
                ),
            },
          },
          Scene.init({ id: 'test' }),
          Scene.expect(Scene.selector('#test-tab-0')).toHaveAttr(
            'aria-controls',
            'test-panel-0',
          ),
          Scene.expect(Scene.selector('#test-tab-1')).toHaveAttr(
            'aria-controls',
            'test-panel-1',
          ),
          Scene.expect(Scene.selector('#test-panel-1')).toExist(),
        ),
    )
  })

  describe('init', () => {
    it.effect(
      'defaults to automatic activation with focus following the selection',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              maybeFocusedIndex: Option.none(),
              activationMode: 'Automatic',
            })
          }),
        ),
    )

    it.effect('accepts a custom activationMode', () =>
      Story.story(
        block,
        Story.init({ id: 'test', activationMode: 'Manual' }),
        Story.model(model => {
          expect(model).toStrictEqual({
            id: 'test',
            maybeFocusedIndex: Option.none(),
            activationMode: 'Manual',
          })
        }),
      ),
    )
  })

  describe('update', () => {
    it.effect('clears focus divergence on SelectedTab and emits Selected', () =>
      Story.story(
        block,
        Story.init({ id: 'test' }),
        Story.message(Message.SelectedTab({ index: 3, value: 'tab-3' })),
        Story.expectOutMessage(
          OutMessage.Selected({ value: 'tab-3', index: 3 }),
        ),
        Story.Command.resolve(FocusTab, Message.CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
        }),
      ),
    )

    it('emits Selected with the committed value on a subsequent SelectedTab', ({
      tabs: { update, init },
    }) => {
      Story.story(
        update,
        Story.given(
          modifyFields(init({ id: 'test' }).model, {
            maybeFocusedIndex: () => Option.some(1),
          }),
        ),
        Story.message(Message.SelectedTab({ index: 0, value: 'tab-0' })),
        Story.expectOutMessage(
          OutMessage.Selected({ value: 'tab-0', index: 0 }),
        ),
        Story.Command.resolve(FocusTab, Message.CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
        }),
      )
    })

    it.effect('sets focus divergence on FocusedTab without an OutMessage', () =>
      Story.story(
        block,
        Story.init({ id: 'test', activationMode: 'Manual' }),
        Story.message(Message.FocusedTab({ index: 2 })),
        Story.Command.resolve(FocusTab, Message.CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.some(2))
        }),
      ),
    )

    it('SelectedTab in manual mode emits Selected and clears divergence', ({
      tabs: { update, init },
    }) => {
      Story.story(
        update,
        Story.given(
          modifyFields(init({ id: 'test', activationMode: 'Manual' }).model, {
            maybeFocusedIndex: () => Option.some(2),
          }),
        ),
        Story.message(Message.SelectedTab({ index: 2, value: 'tab-2' })),
        Story.expectOutMessage(
          OutMessage.Selected({ value: 'tab-2', index: 2 }),
        ),
        Story.Command.resolve(FocusTab, Message.CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
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
