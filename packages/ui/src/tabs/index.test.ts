import { Array, Option, Schema, pipe } from 'effect'
import { Block, Scene, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  FocusTab,
  Message,
  Model,
  OutMessage,
  create,
  findFirstEnabledIndex,
  init,
  keyToIndex,
  update,
  wrapIndex,
} from './tabs.js'

const noneDisabled = () => false

const disabledAt =
  (...indices: ReadonlyArray<number>) =>
  (index: number) =>
    indices.includes(index)

const TestTabs = create()

const TabsSceneDefinition = Block.makeDefinition('TabsScene', {
  Model,
  Message: Schema.Never,
})

const foldTabsOutMessage = TabsSceneDefinition.makeOutMessageFold(TestTabs, {
  Selected: () => model => ({ model }),
})

const TabsBinding = TabsSceneDefinition.makeBinding(TestTabs, {
  read: model => Option.some(model),
  write: (_model, nextTabs) => nextTabs,
}).withOutMessagePolicy({ fold: foldTabsOutMessage })

const TabsSceneComposition = TabsSceneDefinition.makeComposition({
  bindings: [TabsBinding],
})
const sceneUpdate = TabsSceneComposition.makeUpdate({})

const sceneView = TabsSceneComposition.makeView((model, h) =>
  h.block(
    TabsBinding.embedView({
      slotId: 'tabs',
      model,
      viewInputs: {
        tabs: ['First', 'Second'],
        selectedValue: 'First',
        ariaLabel: 'Test tabs',
        toView: ({ tablist, tabs, activeIndex }) =>
          h.div(
            [],
            [
              h.div(
                tablist,
                Array.map(tabs, tab => h.button(tab.tab, [tab.value])),
              ),
              pipe(
                tabs,
                Array.get(activeIndex),
                Option.match({
                  onNone: () => h.empty,
                  onSome: tab => h.div(tab.panel),
                }),
              ),
            ],
          ),
      },
    }),
  ),
)

const allPanelsView = TabsSceneComposition.makeView((model, h) =>
  h.block(
    TabsBinding.embedView({
      slotId: 'tabs',
      model,
      viewInputs: {
        tabs: ['First', 'Second'],
        selectedValue: 'First',
        ariaLabel: 'Test tabs',
        panelMount: 'All',
        toView: ({ tablist, tabs }) =>
          h.div(
            [],
            [
              h.div(
                tablist,
                Array.map(tabs, tab => h.button(tab.tab, [tab.value])),
              ),
              ...Array.map(tabs, tab => h.div(tab.panel)),
            ],
          ),
      },
    }),
  ),
)

describe('Tabs', () => {
  describe('view', () => {
    it('only gives the mounted panel relationship to the active tab', () => {
      Scene.scene(
        { update: sceneUpdate, view: sceneView },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(Scene.selector('#test-tab-0')).toHaveAttr(
          'aria-controls',
          'test-panel-0',
        ),
        Scene.expect(Scene.selector('#test-tab-1')).not.toHaveAttr(
          'aria-controls',
        ),
      )
    })

    it('keeps every panel relationship when all panels remain mounted', () => {
      Scene.scene(
        { update: sceneUpdate, view: allPanelsView },
        Scene.given(init({ id: 'test' }).model),
        Scene.expect(Scene.selector('#test-tab-0')).toHaveAttr(
          'aria-controls',
          'test-panel-0',
        ),
        Scene.expect(Scene.selector('#test-tab-1')).toHaveAttr(
          'aria-controls',
          'test-panel-1',
        ),
        Scene.expect(Scene.selector('#test-panel-1')).toExist(),
      )
    })
  })

  describe('init', () => {
    it('defaults to automatic activation with focus following the selection', () => {
      expect(init({ id: 'test' }).model).toStrictEqual({
        id: 'test',
        maybeFocusedIndex: Option.none(),
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom activationMode', () => {
      expect(
        init({ id: 'test', activationMode: 'Manual' }).model,
      ).toStrictEqual({
        id: 'test',
        maybeFocusedIndex: Option.none(),
        activationMode: 'Manual',
      })
    })
  })

  describe('update', () => {
    it('clears focus divergence on SelectedTab and emits Selected', () => {
      Story.story(
        update,
        Story.given(init({ id: 'test' }).model),
        Story.message(Message.SelectedTab({ index: 3, value: 'tab-3' })),
        Story.expectOutMessage(
          OutMessage.Selected({ value: 'tab-3', index: 3 }),
        ),
        Story.Command.resolve(FocusTab, Message.CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
        }),
      )
    })

    it('emits Selected with the committed value on a subsequent SelectedTab', () => {
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

    it('sets focus divergence on FocusedTab without an OutMessage', () => {
      Story.story(
        update,
        Story.given(init({ id: 'test', activationMode: 'Manual' }).model),
        Story.message(Message.FocusedTab({ index: 2 })),
        Story.Command.resolve(FocusTab, Message.CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.some(2))
        }),
      )
    })

    it('SelectedTab in manual mode emits Selected and clears divergence', () => {
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
