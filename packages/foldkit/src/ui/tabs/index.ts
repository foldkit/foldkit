import {
  Array,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import { keyToIndex } from '../keyboard.js'

export { wrapIndex, findFirstEnabledIndex, keyToIndex } from '../keyboard.js'

// MODEL

/** Controls the tab list layout direction and which arrow keys navigate between tabs. */
export const Orientation = S.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Controls whether tabs activate on focus (`Automatic`) or require an explicit selection (`Manual`). */
export const ActivationMode = S.Literals(['Automatic', 'Manual'])
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
export const CompletedFocusTab = m('CompletedFocusTab')

/** Union of all messages the tabs component can produce. */
export const Message: S.Union<
  [typeof TabSelected, typeof TabFocused, typeof CompletedFocusTab]
> = S.Union([TabSelected, TabFocused, CompletedFocusTab])

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

const tabId = (id: string, index: number): string => `${id}-tab-${index}`

/** Moves focus to the tab at the given index. */
export const FocusTab = Command.define(
  'FocusTab',
  { id: S.String, index: S.Number },
  CompletedFocusTab,
)(({ id, index }) =>
  Dom.focus(`#${tabId(id, index)}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusTab()),
  ),
)

/** Processes a tabs message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      TabSelected: ({ index }) => [
        evo(model, {
          activeIndex: () => index,
          focusedIndex: () => index,
        }),
        [FocusTab({ id: model.id, index })],
      ],
      TabFocused: ({ index }) => [
        evo(model, { focusedIndex: () => index }),
        [FocusTab({ id: model.id, index })],
      ],
      CompletedFocusTab: () => [model, []],
    }),
  )

// VIEW

/** Configuration for an individual tab's button and panel content. */
export type TabConfig<ParentMessage = unknown> = Readonly<{
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  buttonContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  panelContent: Html
}>

/** Configuration for rendering a tab group with `view`. */
export type ViewConfig<ParentMessage, Tab extends string> = Readonly<{
  model: Model
  toParentMessage: (message: TabSelected | TabFocused) => ParentMessage
  onTabSelected?: (index: number) => ParentMessage
  tabs: ReadonlyArray<Tab>
  tabToConfig: (
    tab: Tab,
    context: { isActive: boolean },
  ) => TabConfig<ParentMessage>
  isTabDisabled?: (tab: Tab, index: number) => boolean
  persistPanels?: boolean
  orientation?: Orientation
  tabListElement?: TagName
  tabElement?: TagName
  panelElement?: TagName
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
  tabListClassName?: string
  tabListAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  tabListAriaLabel: string
}>

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

/** Programmatically selects a tab at the given index, updating the model and returning
 *  focus commands. Use this in domain-event handlers when the tab group uses `onTabSelected`. */
export const selectTab = (
  model: Model,
  index: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, TabSelected({ index }))

/** Renders a headless tab group with accessible ARIA roles, roving tabindex, and keyboard navigation. */
export const view = <ParentMessage, Tab extends string>(
  config: ViewConfig<ParentMessage, Tab>,
): Html => {
  const h = html<ParentMessage>()

  const {
    model,
    model: { id, activationMode, focusedIndex },
    toParentMessage,
    onTabSelected,
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

  const dispatchTabSelected = (index: number): ParentMessage =>
    onTabSelected
      ? onTabSelected(index)
      : toParentMessage(TabSelected({ index }))

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

  const handleAutomaticKeyDown = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        Option.some(dispatchTabSelected(resolveKeyIndex(key))),
      ),
      M.whenOr('Enter', ' ', () =>
        Option.some(dispatchTabSelected(focusedIndex)),
      ),
      M.orElse(() => Option.none()),
    )

  const handleManualKeyDown = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        Option.some(
          toParentMessage(TabFocused({ index: resolveKeyIndex(key) })),
        ),
      ),
      M.whenOr('Enter', ' ', () =>
        Option.some(dispatchTabSelected(focusedIndex)),
      ),
      M.orElse(() => Option.none()),
    )

  const handleKeyDown = (key: string): Option.Option<ParentMessage> =>
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

    return h.keyed(tabElement)(
      tabId(id, index),
      [
        h.Id(tabId(id, index)),
        h.Role('tab'),
        h.Type('button'),
        h.AriaSelected(isActive),
        h.AriaControls(tabPanelId(id, index)),
        h.Tabindex(isFocused ? 0 : -1),
        ...(isActive ? [h.DataAttribute('selected', '')] : []),
        ...(isTabDisabledAtIndex
          ? [
              h.Disabled(true),
              h.AriaDisabled(true),
              h.DataAttribute('disabled', ''),
            ]
          : [h.OnClick(dispatchTabSelected(index))]),
        h.OnKeyDownPreventDefault(handleKeyDown),
        ...(tabConfig.buttonClassName
          ? [h.Class(tabConfig.buttonClassName)]
          : []),
        ...(tabConfig.buttonAttributes ?? []),
      ],
      [tabConfig.buttonContent],
    )
  })

  const allPanels = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const panelConfig = tabToConfig(tab, { isActive })

    return h.keyed(panelElement)(
      tabPanelId(id, index),
      [
        h.Id(tabPanelId(id, index)),
        h.Role('tabpanel'),
        h.AriaLabelledBy(tabId(id, index)),
        h.Tabindex(isActive ? 0 : -1),
        h.Hidden(!isActive),
        ...(isActive ? [h.DataAttribute('selected', '')] : []),
        ...(panelConfig.panelClassName
          ? [h.Class(panelConfig.panelClassName)]
          : []),
        ...(panelConfig.panelAttributes ?? []),
        ...(isActive ? [] : [h.Style({ display: 'none' })]),
      ],
      [panelConfig.panelContent],
    )
  })

  const activePanelOnly = pipe(
    tabs,
    Array.get(model.activeIndex),
    Option.match({
      onNone: () => h.empty,
      onSome: tab => {
        const activeConfig = tabToConfig(tab, { isActive: true })

        return h.keyed(panelElement)(
          tabPanelId(id, model.activeIndex),
          [
            h.Id(tabPanelId(id, model.activeIndex)),
            h.Role('tabpanel'),
            h.AriaLabelledBy(tabId(id, model.activeIndex)),
            h.Tabindex(0),
            h.DataAttribute('selected', ''),
            ...(activeConfig.panelClassName
              ? [h.Class(activeConfig.panelClassName)]
              : []),
            ...(activeConfig.panelAttributes ?? []),
          ],
          [activeConfig.panelContent],
        )
      },
    }),
  )

  const tabPanels = persistPanels ? allPanels : [activePanelOnly]

  const resolvedTabListAttributes = [
    h.Role('tablist'),
    h.AriaOrientation(String.toLowerCase(orientation)),
    h.AriaLabel(tabListAriaLabel),
    ...(tabListClassName ? [h.Class(tabListClassName)] : []),
    ...tabListAttributes,
  ]

  return h.div(
    [...(className ? [h.Class(className)] : []), ...attributes],
    [
      h.keyed(tabListElement)(
        `${id}-tablist`,
        resolvedTabListAttributes,
        tabButtons,
      ),
      ...tabPanels,
    ],
  )
}

/** Creates a memoized tabs view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <ParentMessage, Tab extends string>(
  staticConfig: Omit<
    ViewConfig<ParentMessage, Tab>,
    'model' | 'toParentMessage' | 'onTabSelected'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage, Tab>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToParentMessage: ViewConfig<
          ParentMessage,
          Tab
        >['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToParentMessage,
        }),
      [model, toParentMessage],
    )
}
