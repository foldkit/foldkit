import {
  Array,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
  String,
  pipe,
} from 'effect'
import { Block, Command } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import {
  type ChildAttribute,
  type Html,
  type HtmlBuilder,
  childAttributes,
} from 'foldkit/html'
import { type MessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import { keyToIndex } from '../keyboard.js'

export { wrapIndex, findFirstEnabledIndex, keyToIndex } from '../keyboard.js'

// MODEL

/** Controls the tab list layout direction and which arrow keys navigate between Tabs. */
export const Orientation = Schema.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Controls whether tabs activate on focus (`Automatic`) or require an explicit selection (`Manual`). */
export const ActivationMode = Schema.Literals(['Automatic', 'Manual'])
export type ActivationMode = typeof ActivationMode.Type

/** Schema for the tabs component's private interaction state. The active
 *  tab is owned by the parent and passed in via `ViewInputs.selectedValue`,
 *  so it is not stored here. `maybeFocusedIndex` is the roving-tabindex
 *  cursor: `None` means keyboard focus follows the selected tab, and `Manual`
 *  activation stores `Some(index)` while focus diverges from the selection. */
export const Model = Schema.Struct({
  id: Schema.String,
  maybeFocusedIndex: Schema.Option(Schema.Number),
  activationMode: ActivationMode,
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the tabs component can produce. */
export const Message = defineMessageUnion({
  SelectedTab: {
    index: Schema.Number,
    value: Schema.String,
  },
  FocusedTab: { index: Schema.Number },
  CompletedFocusTab: {},
})
export type Message = typeof Message.Type

export type SelectedTab = typeof Message.SelectedTab.Type
export type FocusedTab = typeof Message.FocusedTab.Type

// OUT MESSAGE

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Union of OutMessages the tabs component can produce. The parent handles
 *  them with `tabs.on(...)`. */
export const OutMessage = defineMessageUnion({
  Selected: {
    value: Schema.String,
    index: Schema.Number,
  },
})

/** The OutMessage union on a Tabs class, refined to its Value type. */
type OutMessageSchema<Value extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{ value: Schema.Schema<Value> }>
          }>
      >
    : never

/** Generic over `Value extends string` so consumers using
 *  `Tabs.makeBlock<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// INIT

/** Constructor args for a Tabs instance. `id` prefixes the DOM ids of the
 *  tabs and panels. Activation defaults to `Automatic`. */
export type InitConfig = Readonly<{
  id: string
  activationMode?: ActivationMode
}>

// COMMAND

const tabId = (id: string, index: number): string => `${id}-tab-${index}`

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

/** Moves focus to the tab at the given index. */
export const FocusTab = Command.define('FocusTab', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedFocusTab],
})

// VIEW

/** Per-tab render info passed to the consumer's `toView`. Generic over
 *  `Value extends string`: when `Tabs.makeBlock<MyUnion>()` is declared,
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
 *  - `activeIndex`: the index of `viewInputs.selectedValue` within
 *    `viewInputs.tabs`, convenient when the consumer wants to render only the
 *    active panel (vs all panels with `Hidden` for transitions). */
export type RenderInfo<Value extends string = string> = Readonly<{
  tablist: ReadonlyArray<ChildAttribute>
  tabs: ReadonlyArray<TabInfo<Value>>
  activeIndex: number
}>

/** Describes whether a consumer renders only the active tab panel or keeps
 *  every panel mounted and hides inactive ones. Tab-to-panel references follow
 *  the rendered panel strategy. */
export const PanelMount = Schema.Literals(['ActiveOnly', 'All'])
export type PanelMount = typeof PanelMount.Type

/** View input a parent passes to `tabs.view(...)`.
 *  Generic over `Value extends string` so consumers using
 *  `Tabs.makeBlock<MyUnion>()` receive `tab.value: MyUnion` in `toView`
 *  and `(value: MyUnion, index) => boolean` in `isTabDisabled`, without
 *  casting.
 *
 *  - `selectedValue`: the active tab, read straight from the parent Model.
 *    `aria-selected`, the `data-selected` marker, and which panel is active
 *    all derive from it.
 *  - `panelMount`: defaults to `ActiveOnly`, where the consumer renders only
 *    the active panel. Set `All` when the consumer keeps every panel mounted
 *    and hides inactive ones, so every tab retains its panel relationship. */
export type ViewInputs<Value extends string = string> = Readonly<{
  tabs: ReadonlyArray<Value>
  selectedValue: Value
  ariaLabel: string
  toView: (render: RenderInfo<Value>) => Html
  isTabDisabled?: (value: Value, index: number) => boolean
  orientation?: Orientation
  panelMount?: PanelMount
}>

const renderView = <Value extends string>(
  model: Model,
  viewInputs: ViewInputs<Value>,
  h: HtmlBuilder<Message>,
): Html => {
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
        () => Option.some(Message.FocusedTab({ index: resolveKeyIndex(key) })),
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

  const tabInfos: ReadonlyArray<TabInfo<Value>> = Array.map(
    tabs,
    (value, index) => {
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
    },
  )

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
}

// BLOCK

type Contract<Value extends string> = Readonly<{
  Model: typeof Model
  Message: typeof Message
  OutMessage: OutMessageSchema<Value>
  Command: readonly [typeof FocusTab]
}>

/** A Tabs instance refined to one Value type. Store it in the parent Model
 *  and render it with `tabs.view(viewInputs)`. */
export interface Tabs<
  Value extends string = string,
> extends BlockTypes.Instance<
  Tabs<Value>,
  Contract<Value>,
  InitConfig,
  ViewInputs<Value>
> {}

/** A Tabs class refined to one Value type, with its Layer as `Live`. */
export type TabsClass<Value extends string = string> = BlockTypes.BlockClass<
  Tabs<Value>,
  'Tabs',
  InitConfig,
  ViewInputs<Value>,
  never,
  Contract<Value>
> &
  Readonly<{ Live: Layer.Layer<Tabs<Value>> }>

/**
 * Creates a Tabs class refined to one Value type, with its Layer attached as
 * `Live`. Declare `Tabs.makeBlock<DemoTab>()` once at module scope, create
 * instances with `yield* new DemoTabs(id, { id })` in a parent constructor,
 * and provide `DemoTabs.Live` to the parent's Layer. Its view input and
 * `Selected.value` share the Value type; the parent Model owns the active tab.
 */
export const makeBlock = <
  Value extends string = string,
>(): TabsClass<Value> => {
  const contract: Contract<Value> = {
    Model,
    Message,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    OutMessage: OutMessage as unknown as OutMessageSchema<Value>,
    Command: [FocusTab],
  }

  const TabsClass = Block<Tabs<Value>, InitConfig, ViewInputs<Value>>()(
    'Tabs',
    contract,
  )

  const selected = (value: string, index: number): Selected<Value> =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    contract.OutMessage.Selected({ value: value as Value, index })

  const TabsLive = TabsClass.make(
    Effect.fn(function* (_instanceId, config) {
      return {
        model: {
          id: config.id,
          maybeFocusedIndex: Option.none(),
          activationMode: config.activationMode ?? 'Automatic',
        },
        update: {
          SelectedTab: (model, { index, value }) => ({
            model: modifyFields(model, {
              maybeFocusedIndex: () => Option.none(),
            }),
            commands: [FocusTab({ id: model.id, index })],
            outMessage: selected(value, index),
          }),
          FocusedTab: (model, { index }) => ({
            model: modifyFields(model, {
              maybeFocusedIndex: () => Option.some(index),
            }),
            commands: [FocusTab({ id: model.id, index })],
          }),
          CompletedFocusTab: model => ({ model }),
        },
        commands: {
          FocusTab: ({ id, index }) =>
            Dom.focus(idSelector(tabId(id, index))).pipe(
              Effect.ignore,
              Effect.as(Message.CompletedFocusTab()),
            ),
        },
        view: (model, h, viewInputs) => renderView(model, viewInputs, h),
      }
    }),
  )

  return Object.assign(TabsClass, { Live: TabsLive })
}
