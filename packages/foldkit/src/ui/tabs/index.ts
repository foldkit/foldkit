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
  type BoundaryAttribute,
  type Html,
  type SubmodelView,
  boundaryAttributes,
  defineView,
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

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

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

/** Programmatically selects a tab at the given index. */
export const selectTab = (
  model: Model,
  index: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, TabSelected({ index }))

// VIEW

/** Per-tab render info passed to the consumer's `toView`. Generic over
 *  `Value extends string`: when `Ui.Tabs.create<MyUnion>()` is declared,
 *  `tab.value` is typed `MyUnion` so the consumer can switch on it without
 *  casting. */
export type TabInfo<Value extends string = string> = Readonly<{
  value: Value
  index: number
  isActive: boolean
  isFocused: boolean
  isDisabled: boolean
  tab: ReadonlyArray<BoundaryAttribute>
  panel: ReadonlyArray<BoundaryAttribute>
}>

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `tablist`: ARIA + role attributes for the wrapping tablist element.
 *  - `tabs`: one entry per tab in `inputs.tabs`, in the same order, with
 *    the tab button's attribute bundle, the panel's attribute bundle,
 *    and derived state.
 *  - `activeIndex`: the currently-active tab index, convenient when the
 *    consumer wants to render only the active panel (vs all panels with
 *    `Hidden` for transitions). */
export type RenderInfo<Value extends string = string> = Readonly<{
  tablist: ReadonlyArray<BoundaryAttribute>
  tabs: ReadonlyArray<TabInfo<Value>>
  activeIndex: number
}>

/** Per-render inputs passed to `view` via `h.submodel`'s `inputs` field.
 *  Generic over `Value extends string` so consumers using
 *  `Ui.Tabs.create<MyUnion>()` receive `tab.value: MyUnion` in `toView`
 *  and `(value: MyUnion, index) => boolean` in `isTabDisabled`, without
 *  casting. */
export type ViewInputs<Value extends string = string> = Readonly<{
  tabs: ReadonlyArray<Value>
  ariaLabel: string
  toView: (render: RenderInfo<Value>) => Html
  isTabDisabled?: (value: Value, index: number) => boolean
  orientation?: Orientation
}>

const internalView = defineView<Model, Message, ViewInputs>(
  (model, inputs): Html => {
    const h = html<Message>()

    const { id, activationMode, focusedIndex, activeIndex } = model
    const {
      tabs,
      ariaLabel,
      toView,
      isTabDisabled,
      orientation = 'Horizontal',
    } = inputs

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

    const handleAutomaticKeyDown = (key: string): Option.Option<TabSelected> =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => Option.some(TabSelected({ index: resolveKeyIndex(key) })),
        ),
        M.whenOr('Enter', ' ', () =>
          Option.some(TabSelected({ index: focusedIndex })),
        ),
        M.orElse(() => Option.none()),
      )

    const handleManualKeyDown = (
      key: string,
    ): Option.Option<TabSelected | TabFocused> =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => Option.some(TabFocused({ index: resolveKeyIndex(key) })),
        ),
        M.whenOr('Enter', ' ', () =>
          Option.some(TabSelected({ index: focusedIndex })),
        ),
        M.orElse(() => Option.none()),
      )

    const handleKeyDown = (
      key: string,
    ): Option.Option<TabSelected | TabFocused> =>
      M.value(activationMode).pipe(
        M.when('Automatic', () => handleAutomaticKeyDown(key)),
        M.when('Manual', () => handleManualKeyDown(key)),
        M.exhaustive,
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
        h.AriaControls(tabPanelId(id, index)),
        h.Tabindex(isFocused ? 0 : -1),
        ...(isActive ? [h.DataAttribute('selected', '')] : []),
        ...(isTabDisabledNow
          ? [
              h.Disabled(true),
              h.AriaDisabled(true),
              h.DataAttribute('disabled', ''),
            ]
          : [h.OnClick(TabSelected({ index }))]),
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
        tab: boundaryAttributes(tabAttributes),
        panel: boundaryAttributes(panelAttributes),
      }
    })

    const tablistAttributes = [
      h.Role('tablist'),
      h.AriaOrientation(String.toLowerCase(orientation)),
      h.AriaLabel(ariaLabel),
    ]

    return toView({
      tablist: boundaryAttributes(tablistAttributes),
      tabs: tabInfos,
      activeIndex,
    })
  },
)

/** Pairs the tabs `view`, `update`, and `selectTab` behind a single
 *  Value-typed entry point. Declare once at module scope so consumers
 *  receive `tab.value: Value` in `toView` without an `as` cast:
 *
 *  ```ts
 *  const DemoTabs = Ui.Tabs.create<DemoTab>()
 *
 *  // In view:
 *  h.submodel({ view: DemoTabs.view, ... })
 *
 *  // In update:
 *  const [next, commands] = DemoTabs.update(model, message)
 *  ```
 *
 *  The internal view stays typed `ReadonlyArray<string>`; consumers can
 *  pass a `ReadonlyArray<MyUnion>` (assignable) and the fenced cast inside
 *  `create` types `TabInfo.value` as `MyUnion`. */
export const create = <Value extends string = string>(): Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Value>>
  update: (
    model: Model,
    message: Message,
  ) => readonly [Model, ReadonlyArray<Command.Command<Message>>]
  selectTab: (
    model: Model,
    index: number,
  ) => readonly [Model, ReadonlyArray<Command.Command<Message>>]
}> => ({
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  view: internalView as unknown as SubmodelView<
    Model,
    Message,
    ViewInputs<Value>
  >,
  update,
  selectTab,
})
