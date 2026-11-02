import { Array, Match, Option, String, pipe } from 'effect'
import { childAttributes } from 'foldkit/html'

import { keyToIndex } from '../keyboard.js'
import { TabsComposition } from './composition.js'
import { tabId, tabPanelId } from './ids.js'
import {
  type FocusedTab,
  Message,
  type SelectedTab,
  type TabInfo,
} from './types.js'

/** @internal Canonical Tabs implementation. */
export const view = TabsComposition.makeView.withInputs(
  (model, viewInputs, h) => {
    const { id, activationMode, maybeFocusedIndex } = model
    const {
      tabs,
      selectedValue,
      ariaLabel,
      toView,
      isTabDisabled,
      orientation = 'Horizontal',
      panelMount = 'ActiveOnly',
    } = viewInputs

    const activeIndex = pipe(
      tabs,
      Array.findFirstIndex(tab => tab === selectedValue),
      Option.getOrElse(() => 0),
    )

    const focusedIndex = pipe(
      maybeFocusedIndex,
      Option.filter(index => index < tabs.length),
      Option.getOrElse(() => activeIndex),
    )

    const isDisabled = (index: number): boolean =>
      !!isTabDisabled &&
      pipe(
        tabs,
        Array.get(index),
        Option.exists(tab => isTabDisabled(tab, index)),
      )

    const { nextKey, previousKey } = Match.value(orientation).pipe(
      Match.when('Horizontal', () => ({
        nextKey: 'ArrowRight',
        previousKey: 'ArrowLeft',
      })),
      Match.when('Vertical', () => ({
        nextKey: 'ArrowDown',
        previousKey: 'ArrowUp',
      })),
      Match.exhaustive,
    )

    const resolveKeyIndex = keyToIndex(
      nextKey,
      previousKey,
      tabs.length,
      focusedIndex,
      isDisabled,
    )

    const tabSelectedAt = (index: number): Option.Option<SelectedTab> =>
      pipe(
        tabs,
        Array.get(index),
        Option.map(value => Message.SelectedTab({ index, value })),
      )

    const handleAutomaticKeyDown = (key: string): Option.Option<SelectedTab> =>
      Match.value(key).pipe(
        Match.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => tabSelectedAt(resolveKeyIndex(key)),
        ),
        Match.whenOr('Enter', ' ', () => tabSelectedAt(focusedIndex)),
        Match.orElse(() => Option.none()),
      )

    const handleManualKeyDown = (
      key: string,
    ): Option.Option<SelectedTab | FocusedTab> =>
      Match.value(key).pipe(
        Match.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () =>
            Option.some(Message.FocusedTab({ index: resolveKeyIndex(key) })),
        ),
        Match.whenOr('Enter', ' ', () => tabSelectedAt(focusedIndex)),
        Match.orElse(() => Option.none()),
      )

    const handleKeyDown = (
      key: string,
    ): Option.Option<SelectedTab | FocusedTab> =>
      Match.value(activationMode).pipe(
        Match.when('Automatic', () => handleAutomaticKeyDown(key)),
        Match.when('Manual', () => handleManualKeyDown(key)),
        Match.exhaustive,
      )

    const tabInfos: ReadonlyArray<TabInfo> = Array.map(tabs, (value, index) => {
      const isActive = index === activeIndex
      const isFocused = index === focusedIndex
      const isTabDisabledNow = isDisabled(index)

      const tabAttributes = [
        h.Id(tabId(id, index)),
        h.Role('tab'),
        h.Type('button'),
        h.AriaSelected(isActive),
        ...(isActive || panelMount === 'All'
          ? [h.AriaControls(tabPanelId(id, index))]
          : []),
        h.Tabindex(isFocused ? 0 : -1),
        ...(isActive ? [h.DataAttribute('selected', '')] : []),
        ...(isTabDisabledNow
          ? [
              h.Disabled(true),
              h.AriaDisabled(true),
              h.DataAttribute('disabled', ''),
            ]
          : [h.OnClick(Message.SelectedTab({ index, value }))]),
        h.OnKeyDownPreventDefault(handleKeyDown),
      ]

      const panelAttributes = [
        h.Id(tabPanelId(id, index)),
        h.Role('tabpanel'),
        h.AriaLabelledBy(tabId(id, index)),
        h.Tabindex(isActive ? 0 : -1),
        ...(isActive ? [h.DataAttribute('selected', '')] : []),
      ]

      return {
        value,
        index,
        isActive,
        isFocused,
        isDisabled: isTabDisabledNow,
        tab: childAttributes(tabAttributes),
        panel: childAttributes(panelAttributes),
      }
    })

    const tablistAttributes = [
      h.Role('tablist'),
      h.AriaOrientation(String.toLowerCase(orientation)),
      h.AriaLabel(ariaLabel),
    ]

    return toView({
      tablist: childAttributes(tablistAttributes),
      tabs: tabInfos,
      activeIndex,
    })
  },
)
