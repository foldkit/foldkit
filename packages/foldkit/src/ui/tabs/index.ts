import {
  Array,
  Effect,
  Function,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import {
  type ChildAttribute,
  type Html,
  type SubmodelView,
  childAttributes,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type { Reflect2 } from '../../submodel/submodel.js'
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
export const SelectedTab = m('SelectedTab', {
  index: S.Number,
  value: S.String,
})
/** Sent when a tab receives keyboard focus in `Manual` mode without being activated. */
export const FocusedTab = m('FocusedTab', { index: S.Number })
/** Sent when the focus-tab command completes. */
export const CompletedFocusTab = m('CompletedFocusTab')

/** Union of all messages the tabs component can produce. */
export const Message: S.Union<
  [typeof SelectedTab, typeof FocusedTab, typeof CompletedFocusTab]
> = S.Union([SelectedTab, FocusedTab, CompletedFocusTab])

export type SelectedTab = typeof SelectedTab.Type
export type FocusedTab = typeof FocusedTab.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent when a tab is committed via click or keyboard. Carries both the tab's value (typed as `Value` via `Ui.Tabs.create<Value>()`) and its index. Generic at the type level; the schema stores `value: string` and the factory's fenced cast types it as `Value`. */
export const Selected = m('Selected', {
  value: S.String,
  index: S.Number,
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Union of out-messages the tabs component can produce. Surfaced as the third element of `update`'s return tuple and pattern-matched by the parent. */
export const OutMessage = S.Union([Selected])

/** Generic over `Value extends string` so consumers using
 *  `Ui.Tabs.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

/** Processes a tabs message and returns the next model, commands, and an optional OutMessage. `Selected` fires when a tab is committed via click or keyboard. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      SelectedTab: ({ index, value }) => [
        evo(model, {
          activeIndex: () => index,
          focusedIndex: () => index,
        }),
        [FocusTab({ id: model.id, index })],
        Option.some(Selected({ value, index })),
      ],
      FocusedTab: ({ index }) => [
        evo(model, { focusedIndex: () => index }),
        [FocusTab({ id: model.id, index })],
        Option.none(),
      ],
      CompletedFocusTab: () => [model, [], Option.none()],
    }),
  )

/** Programmatically selects a tab. Emits a `Selected` OutMessage. */
export const selectTab = (
  model: Model,
  value: string,
  index: number,
): UpdateReturn => update(model, SelectedTab({ index, value }))

/** Reflects an externally-sourced active tab onto the model without
 *  emitting an OutMessage or running the focus command. Use this to mirror
 *  external truth (a deep link, restored storage) onto the active tab.
 *  Contrast with `selectTab`, which represents a user or programmatic
 *  *choice*: it focuses the tab and emits `Selected`. Takes the tab `value`
 *  plus the `options` list (mirroring `RadioGroup.select`) because Tabs
 *  stores the active *index* internally, so the value is resolved to an
 *  index. A value not present in `options` is a no-op. Returns the model
 *  directly because it produces no commands and no OutMessage. */
export const reflectSelectedTab: Reflect2<
  Model,
  string,
  ReadonlyArray<string>
> = Function.dual(
  3,
  (model: Model, value: string, options: ReadonlyArray<string>): Model =>
    pipe(
      options,
      Array.findFirstIndex(option => option === value),
      Option.match({
        onNone: () => model,
        onSome: index =>
          evo(model, { activeIndex: () => index, focusedIndex: () => index }),
      }),
    ),
)

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
  tab: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
}>

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `tablist`: ARIA + role attributes for the wrapping tablist element.
 *  - `tabs`: one entry per tab in `viewInputs.tabs`, in the same order, with
 *    the tab button's attribute bundle, the panel's attribute bundle,
 *    and derived state.
 *  - `activeIndex`: the currently-active tab index, convenient when the
 *    consumer wants to render only the active panel (vs all panels with
 *    `Hidden` for transitions). */
export type RenderInfo<Value extends string = string> = Readonly<{
  tablist: ReadonlyArray<ChildAttribute>
  tabs: ReadonlyArray<TabInfo<Value>>
  activeIndex: number
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
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
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, activationMode, focusedIndex, activeIndex } = model
    const {
      tabs,
      ariaLabel,
      toView,
      isTabDisabled,
      orientation = 'Horizontal',
    } = viewInputs

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

    const tabSelectedAt = (index: number): Option.Option<SelectedTab> =>
      pipe(
        tabs,
        Array.get(index),
        Option.map(value => SelectedTab({ index, value })),
      )

    const handleAutomaticKeyDown = (key: string): Option.Option<SelectedTab> =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => tabSelectedAt(resolveKeyIndex(key)),
        ),
        M.whenOr('Enter', ' ', () => tabSelectedAt(focusedIndex)),
        M.orElse(() => Option.none()),
      )

    const handleManualKeyDown = (
      key: string,
    ): Option.Option<SelectedTab | FocusedTab> =>
      M.value(key).pipe(
        M.whenOr(
          nextKey,
          previousKey,
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () => Option.some(FocusedTab({ index: resolveKeyIndex(key) })),
        ),
        M.whenOr('Enter', ' ', () => tabSelectedAt(focusedIndex)),
        M.orElse(() => Option.none()),
      )

    const handleKeyDown = (
      key: string,
    ): Option.Option<SelectedTab | FocusedTab> =>
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
          : [h.OnClick(SelectedTab({ index, value }))]),
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
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  selectTab: (
    model: Model,
    value: Value,
    index: number,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  reflectSelectedTab: Reflect2<Model, Value, ReadonlyArray<Value>>
}> => {
  type GenericReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  const cast = (result: UpdateReturn): GenericReturn =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    result as unknown as GenericReturn

  return {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    view: internalView as unknown as SubmodelView<
      Model,
      Message,
      ViewInputs<Value>
    >,
    update: (model, message) => cast(update(model, message)),
    selectTab: (model, value, index) => cast(selectTab(model, value, index)),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    reflectSelectedTab: reflectSelectedTab as Reflect2<
      Model,
      Value,
      ReadonlyArray<Value>
    >,
  }
}
