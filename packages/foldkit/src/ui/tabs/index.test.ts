import { describe, it } from '@effect/vitest'
import { Effect, Predicate } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { html } from '../../html'
import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/crashUI'
import type { ViewConfig } from './index'
import {
  TabFocused,
  TabSelected,
  findFirstEnabledIndex,
  init,
  keyToIndex,
  update,
  view,
  wrapIndex,
} from './index'

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
      const model = init({ id: 'test' })
      const [result] = update(model, TabSelected({ index: 3 }))
      expect(result.activeIndex).toBe(3)
      expect(result.focusedIndex).toBe(3)
    })

    it('replaces activeIndex on subsequent TabSelected', () => {
      const model = init({ id: 'test', activeIndex: 1 })
      const [result] = update(model, TabSelected({ index: 0 }))
      expect(result.activeIndex).toBe(0)
      expect(result.focusedIndex).toBe(0)
    })

    it('returns a FocusTab command on TabSelected', () => {
      const model = init({ id: 'test' })
      const [, commands] = update(model, TabSelected({ index: 2 }))
      expect(commands).toHaveLength(1)
      expect(commands[0]?.name).toBe('FocusTab')
    })

    it('updates only focusedIndex on TabFocused', () => {
      const model = init({ id: 'test', activationMode: 'Manual' })
      const [result] = update(model, TabFocused({ index: 2 }))
      expect(result.activeIndex).toBe(0)
      expect(result.focusedIndex).toBe(2)
    })

    it('returns a FocusTab command on TabFocused', () => {
      const model = init({ id: 'test', activationMode: 'Manual' })
      const [, commands] = update(model, TabFocused({ index: 2 }))
      expect(commands).toHaveLength(1)
      expect(commands[0]?.name).toBe('FocusTab')
    })

    it('does not change activeIndex on TabFocused', () => {
      const model = init({
        id: 'test',
        activeIndex: 1,
        activationMode: 'Manual',
      })
      const [result] = update(model, TabFocused({ index: 3 }))
      expect(result.activeIndex).toBe(1)
      expect(result.focusedIndex).toBe(3)
    })

    it('TabSelected updates both indices in manual mode', () => {
      const model = {
        ...init({ id: 'test', activationMode: 'Manual' }),
        focusedIndex: 2,
      }
      const [result] = update(model, TabSelected({ index: 2 }))
      expect(result.activeIndex).toBe(2)
      expect(result.focusedIndex).toBe(2)
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

  describe('view', () => {
    type TestMessage = string

    const { DataAttribute } = html<TestMessage>()

    const tabs = ['Alpha', 'Beta', 'Gamma'] as const
    type Tab = (typeof tabs)[number]

    const baseViewConfig = (
      overrides: Partial<ViewConfig<TestMessage, Tab>> = {},
    ): ViewConfig<TestMessage, Tab> => ({
      model: init({ id: 'test' }),
      toMessage: message => message._tag,
      tabs,
      tabToConfig: () => ({
        buttonContent: Effect.succeed(null),
        panelContent: Effect.succeed(null),
      }),
      tabListAriaLabel: 'Test tabs',
      ...overrides,
    })

    const renderView = (config: ViewConfig<TestMessage, Tab>): VNode => {
      const vnode = Effect.runSync(
        Effect.provideService(view(config), Dispatch, noOpDispatch),
      )
      if (Predicate.isNull(vnode)) {
        throw new Error('Expected vnode, got null')
      }
      return vnode
    }

    const findChildByKey = (vnode: VNode, key: string): VNode | undefined =>
      vnode.children?.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.key === key,
      )

    const findAllByKey = (
      vnode: VNode,
      keyPrefix: string,
    ): ReadonlyArray<VNode> =>
      (vnode.children?.filter(
        (child): child is VNode =>
          typeof child !== 'string' &&
          typeof child.key === 'string' &&
          child.key.startsWith(keyPrefix),
      ) ?? []) as ReadonlyArray<VNode>

    describe('ViewConfig.attributes', () => {
      it('applies attributes to the wrapper element', () => {
        const vnode = renderView(
          baseViewConfig({
            attributes: [DataAttribute('testid', 'tabs-wrapper')],
          }),
        )

        expect(vnode.data?.attrs?.['data-testid']).toBe('tabs-wrapper')
      })

      it('applies className and attributes together on the wrapper', () => {
        const vnode = renderView(
          baseViewConfig({
            className: 'wrapper-class',
            attributes: [DataAttribute('testid', 'tabs-wrapper')],
          }),
        )

        expect(vnode.data?.class?.['wrapper-class']).toBe(true)
        expect(vnode.data?.attrs?.['data-testid']).toBe('tabs-wrapper')
      })
    })

    describe('ViewConfig.tabListAttributes', () => {
      it('applies tabListAttributes to the tab list element', () => {
        const vnode = renderView(
          baseViewConfig({
            tabListAttributes: [DataAttribute('testid', 'tab-list')],
          }),
        )
        const tabList = findChildByKey(vnode, 'test-tablist')

        expect(tabList?.data?.attrs?.['data-testid']).toBe('tab-list')
      })

      it('applies tabListClassName and tabListAttributes together', () => {
        const vnode = renderView(
          baseViewConfig({
            tabListClassName: 'tab-list-class',
            tabListAttributes: [DataAttribute('testid', 'tab-list')],
          }),
        )
        const tabList = findChildByKey(vnode, 'test-tablist')

        expect(tabList?.data?.class?.['tab-list-class']).toBe(true)
        expect(tabList?.data?.attrs?.['data-testid']).toBe('tab-list')
      })
    })

    describe('TabConfig.buttonAttributes', () => {
      it('applies buttonAttributes to tab buttons', () => {
        const vnode = renderView(
          baseViewConfig({
            tabToConfig: (_tab, { isActive }) => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              buttonAttributes: [
                DataAttribute('active', isActive ? 'true' : 'false'),
              ],
            }),
          }),
        )
        const tabList = findChildByKey(vnode, 'test-tablist')
        const buttons = findAllByKey(tabList!, 'test-tab-')

        expect(buttons[0]?.data?.attrs?.['data-active']).toBe('true')
        expect(buttons[1]?.data?.attrs?.['data-active']).toBe('false')
        expect(buttons[2]?.data?.attrs?.['data-active']).toBe('false')
      })

      it('applies buttonClassName and buttonAttributes together', () => {
        const vnode = renderView(
          baseViewConfig({
            tabToConfig: () => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              buttonClassName: 'tab-button',
              buttonAttributes: [DataAttribute('testid', 'btn')],
            }),
          }),
        )
        const tabList = findChildByKey(vnode, 'test-tablist')
        const buttons = findAllByKey(tabList!, 'test-tab-')

        expect(buttons[0]?.data?.class?.['tab-button']).toBe(true)
        expect(buttons[0]?.data?.attrs?.['data-testid']).toBe('btn')
      })
    })

    describe('TabConfig.panelAttributes', () => {
      it('applies panelAttributes in activePanelOnly mode', () => {
        const vnode = renderView(
          baseViewConfig({
            tabToConfig: () => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              panelAttributes: [DataAttribute('testid', 'panel')],
            }),
          }),
        )
        const panel = findChildByKey(vnode, 'test-panel-0')

        expect(panel?.data?.attrs?.['data-testid']).toBe('panel')
      })

      it('applies panelClassName and panelAttributes together in activePanelOnly mode', () => {
        const vnode = renderView(
          baseViewConfig({
            tabToConfig: () => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              panelClassName: 'panel-class',
              panelAttributes: [DataAttribute('testid', 'panel')],
            }),
          }),
        )
        const panel = findChildByKey(vnode, 'test-panel-0')

        expect(panel?.data?.class?.['panel-class']).toBe(true)
        expect(panel?.data?.attrs?.['data-testid']).toBe('panel')
      })

      it('applies panelAttributes in persistPanels mode', () => {
        const vnode = renderView(
          baseViewConfig({
            persistPanels: true,
            tabToConfig: (_tab, { isActive }) => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              panelAttributes: [
                DataAttribute('active', isActive ? 'true' : 'false'),
              ],
            }),
          }),
        )
        const panels = findAllByKey(vnode, 'test-panel-')

        expect(panels[0]?.data?.attrs?.['data-active']).toBe('true')
        expect(panels[1]?.data?.attrs?.['data-active']).toBe('false')
        expect(panels[2]?.data?.attrs?.['data-active']).toBe('false')
      })

      it('applies panelClassName and panelAttributes together in persistPanels mode', () => {
        const vnode = renderView(
          baseViewConfig({
            persistPanels: true,
            tabToConfig: () => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              panelClassName: 'panel-class',
              panelAttributes: [DataAttribute('testid', 'panel')],
            }),
          }),
        )
        const panels = findAllByKey(vnode, 'test-panel-')

        expect(panels[0]?.data?.class?.['panel-class']).toBe(true)
        expect(panels[0]?.data?.attrs?.['data-testid']).toBe('panel')
        expect(panels[1]?.data?.class?.['panel-class']).toBe(true)
        expect(panels[1]?.data?.attrs?.['data-testid']).toBe('panel')
      })

      it('renders only the active panel in activePanelOnly mode', () => {
        const model = init({ id: 'test', activeIndex: 1 })
        const vnode = renderView(
          baseViewConfig({
            model,
            tabToConfig: (_tab, { isActive }) => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              panelAttributes: [
                DataAttribute('active', isActive ? 'true' : 'false'),
              ],
            }),
          }),
        )
        const panels = findAllByKey(vnode, 'test-panel-')

        expect(panels).toHaveLength(1)
        expect(panels[0]?.key).toBe('test-panel-1')
        expect(panels[0]?.data?.attrs?.['data-active']).toBe('true')
      })

      it('renders all panels in persistPanels mode', () => {
        const model = init({ id: 'test', activeIndex: 1 })
        const vnode = renderView(
          baseViewConfig({
            model,
            persistPanels: true,
            tabToConfig: (_tab, { isActive }) => ({
              buttonContent: Effect.succeed(null),
              panelContent: Effect.succeed(null),
              panelAttributes: [
                DataAttribute('active', isActive ? 'true' : 'false'),
              ],
            }),
          }),
        )
        const panels = findAllByKey(vnode, 'test-panel-')

        expect(panels).toHaveLength(3)
        expect(panels[0]?.data?.attrs?.['data-active']).toBe('false')
        expect(panels[1]?.data?.attrs?.['data-active']).toBe('true')
        expect(panels[2]?.data?.attrs?.['data-active']).toBe('false')
      })
    })
  })
})
