import {
  Array,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'

import type { Command } from '../../command'
import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { keyToIndex } from '../keyboard'

export { wrapIndex, findFirstEnabledIndex, keyToIndex } from '../keyboard'

// MODEL

/** Controls the tab list layout direction and which arrow keys navigate between tabs. */
export const Orientation = S.Literal('Horizontal', 'Vertical')
export type Orientation = typeof Orientation.Type

/** Controls whether tabs activate on focus (`Automatic`) or require an explicit selection (`Manual`). */
export const ActivationMode = S.Literal('Automatic', 'Manual')
export type ActivationMode = typeof ActivationMode.Type

/** Schema for the tabs component's state, tracking active/focused indices and activation mode. */
export const Model = S.Struct({
  id: S.String,
  activeIndex: S.Number,
  focusedIndex: S.Number,
  activationMode: ActivationMode,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when a tab is selected via click or keyboard. Updates both the active and focused indices. */
export const TabSelected = m('TabSelected', { index: S.Number })
/** Sent when a tab receives keyboard focus in `Manual` mode without being activated. */
export const TabFocused = m('TabFocused', { index: S.Number })
/** Sent when the focus-tab command completes. */
export const CompletedTabFocus = m('CompletedTabFocus')

/** Union of all messages the tabs component can produce. */
export const Message = S.Union(TabSelected, TabFocused, CompletedTabFocus)

export type TabSelected = typeof TabSelected.Type
export type TabFocused = typeof TabFocused.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a tabs model with `init`. */
export type InitConfig = Readonly<{
  id: string
  activeIndex?: number
  activationMode?: ActivationMode
}>

/** Creates an initial tabs model from a config. Defaults to first tab and automatic activation. */
export const init = (config: InitConfig): Model => {
  const activeIndex = config.activeIndex ?? 0

  return {
    id: config.id,
    activeIndex,
    focusedIndex: activeIndex,
    activationMode: config.activationMode ?? 'Automatic',
  }
}

// UPDATE

/** Processes a tabs message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      TabSelected: ({ index }) => {
        const tabSelector = `#${tabId(model.id, index)}`

        return [
          evo(model, {
            activeIndex: () => index,
            focusedIndex: () => index,
          }),
          [
            Task.focus(tabSelector).pipe(
              Effect.ignore,
              Effect.as(CompletedTabFocus()),
            ),
          ],
        ]
      },
      TabFocused: ({ index }) => {
        const tabSelector = `#${tabId(model.id, index)}`

        return [
          evo(model, { focusedIndex: () => index }),
          [
            Task.focus(tabSelector).pipe(
              Effect.ignore,
              Effect.as(CompletedTabFocus()),
            ),
          ],
        ]
      },
      CompletedTabFocus: () => [model, []],
    }),
  )

// VIEW

/** Configuration for an individual tab's button and panel content. */
export type TabConfig = Readonly<{
  buttonClassName?: string
  buttonContent: Html
  panelClassName?: string
  panelContent: Html
}>

/** Configuration for rendering a tab group with `view`. */
export type ViewConfig<Message, Tab extends string> = Readonly<{
  model: Model
  toMessage: (message: TabSelected | TabFocused) => Message
  tabs: ReadonlyArray<Tab>
  tabToConfig: (tab: Tab, context: { isActive: boolean }) => TabConfig
  isTabDisabled?: (tab: Tab, index: number) => boolean
  persistPanels?: boolean
  orientation?: Orientation
  tabListElement?: TagName
  tabElement?: TagName
  panelElement?: TagName
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
  tabListClassName?: string
  tabListAttributes?: ReadonlyArray<Attribute<Message>>
  tabListAriaLabel: string
}>

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

const tabId = (id: string, index: number): string => `${id}-tab-${index}`

/** Renders a headless tab group with accessible ARIA roles, roving tabindex, and keyboard navigation. */
export const view = <Message, Tab extends string>(
  config: ViewConfig<Message, Tab>,
): Html => {
  const {
    div,
    empty,
    AriaControls,
    AriaDisabled,
    AriaLabel,
    AriaLabelledBy,
    AriaOrientation,
    AriaSelected,
    Class,
    DataAttribute,
    Disabled,
    Hidden,
    Id,
    OnClick,
    OnKeyDownPreventDefault,
    Role,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model,
    model: { id, activationMode, focusedIndex },
    toMessage,
    tabs,
    tabToConfig,
    isTabDisabled,
    persistPanels,
    orientation = 'Horizontal',
    tabListElement = 'div',
    tabElement = 'button',
    panelElement = 'div',
    className,
    attributes = [],
    tabListClassName,
    tabListAttributes = [],
    tabListAriaLabel,
  } = config

  const isDisabled = (index: number): boolean =>
    !!isTabDisabled &&
    pipe(
      tabs,
      Array.get(index),
      Option.exists(tab => isTabDisabled(tab, index)),
    )

  const { nextKey, previousKey } = M.value(orientation).pipe(
    M.when('Horizontal', () => ({
      nextKey: 'ArrowRight',
      previousKey: 'ArrowLeft',
    })),
    M.when('Vertical', () => ({
      nextKey: 'ArrowDown',
      previousKey: 'ArrowUp',
    })),
    M.exhaustive,
  )

  const resolveKeyIndex = keyToIndex(
    nextKey,
    previousKey,
    tabs.length,
    focusedIndex,
    isDisabled,
  )

  const handleAutomaticKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        Option.some(toMessage(TabSelected({ index: resolveKeyIndex(key) }))),
      ),
      M.whenOr('Enter', ' ', () =>
        Option.some(toMessage(TabSelected({ index: focusedIndex }))),
      ),
      M.orElse(() => Option.none()),
    )

  const handleManualKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        Option.some(toMessage(TabFocused({ index: resolveKeyIndex(key) }))),
      ),
      M.whenOr('Enter', ' ', () =>
        Option.some(toMessage(TabSelected({ index: focusedIndex }))),
      ),
      M.orElse(() => Option.none()),
    )

  const handleKeyDown = (key: string): Option.Option<Message> =>
    M.value(activationMode).pipe(
      M.when('Automatic', () => handleAutomaticKeyDown(key)),
      M.when('Manual', () => handleManualKeyDown(key)),
      M.exhaustive,
    )

  const tabButtons = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const isFocused = index === focusedIndex
    const isTabDisabledAtIndex = isDisabled(index)
    const tabConfig = tabToConfig(tab, { isActive })

    return keyed(tabElement)(
      tabId(id, index),
      [
        Id(tabId(id, index)),
        Role('tab'),
        Type('button'),
        AriaSelected(isActive),
        AriaControls(tabPanelId(id, index)),
        Tabindex(isFocused ? 0 : -1),
        ...(isActive ? [DataAttribute('selected', '')] : []),
        ...(isTabDisabledAtIndex
          ? [Disabled(true), AriaDisabled(true), DataAttribute('disabled', '')]
          : [OnClick(toMessage(TabSelected({ index })))]),
        OnKeyDownPreventDefault(handleKeyDown),
        ...(tabConfig.buttonClassName
          ? [Class(tabConfig.buttonClassName)]
          : []),
      ],
      [tabConfig.buttonContent],
    )
  })

  const allPanels = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const panelConfig = tabToConfig(tab, { isActive })

    return keyed(panelElement)(
      tabPanelId(id, index),
      [
        Id(tabPanelId(id, index)),
        Role('tabpanel'),
        AriaLabelledBy(tabId(id, index)),
        Tabindex(isActive ? 0 : -1),
        Hidden(!isActive),
        ...(isActive ? [DataAttribute('selected', '')] : []),
        ...(panelConfig.panelClassName
          ? [Class(panelConfig.panelClassName)]
          : []),
      ],
      [panelConfig.panelContent],
    )
  })

  const activePanelOnly = pipe(
    tabs,
    Array.get(model.activeIndex),
    Option.match({
      onNone: () => empty,
      onSome: tab => {
        const activeConfig = tabToConfig(tab, { isActive: true })

        return keyed(panelElement)(
          tabPanelId(id, model.activeIndex),
          [
            Id(tabPanelId(id, model.activeIndex)),
            Role('tabpanel'),
            AriaLabelledBy(tabId(id, model.activeIndex)),
            Tabindex(0),
            DataAttribute('selected', ''),
            ...(activeConfig.panelClassName
              ? [Class(activeConfig.panelClassName)]
              : []),
          ],
          [activeConfig.panelContent],
        )
      },
    }),
  )

  const tabPanels = persistPanels ? allPanels : [activePanelOnly]

  const resolvedTabListAttributes = [
    Role('tablist'),
    AriaOrientation(String.toLowerCase(orientation)),
    AriaLabel(tabListAriaLabel),
    ...(tabListClassName ? [Class(tabListClassName)] : []),
    ...tabListAttributes,
  ]

  return div(
    [...(className ? [Class(className)] : []), ...attributes],
    [
      keyed(tabListElement)(
        `${id}-tablist`,
        resolvedTabListAttributes,
        tabButtons,
      ),
      ...tabPanels,
    ],
  )
}

/** Creates a memoized tabs view. Static config is captured in a closure;
 *  only `model` and `toMessage` are compared per render via `createLazy`. */
export const lazy = <Message, Tab extends string>(
  staticConfig: Omit<ViewConfig<Message, Tab>, 'model' | 'toMessage'>,
): ((
  model: Model,
  toMessage: ViewConfig<Message, Tab>['toMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message, Tab>['toMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toMessage: currentToMessage,
        }),
      [model, toMessage],
    )
}
