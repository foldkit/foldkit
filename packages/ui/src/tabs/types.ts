import { Schema } from 'effect'
import { type ChildAttribute, type Html } from 'foldkit/html'
import { type MessageUnion, defineMessageUnion } from 'foldkit/message'

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

/** Union of OutMessages the tabs component can produce. The parent's
 *  parent bindings handle them through their OutMessage policy. */
export const OutMessage = defineMessageUnion({
  Selected: {
    value: Schema.String,
    index: Schema.Number,
  },
})

/** The OutMessage union interface on completed Tabs, refined to its Value
 * type. */
export type OutMessageSchema<Value extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{
                value: Schema.Codec<Value, Value> &
                  Readonly<{ '~type.make': Value }>
              }>
          }>
      >
    : never

/** Generic over `Value extends string` so consumers using
 *  `Tabs.makeBlock<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

/** Startup configuration shared by every Tabs occurrence. */
export const InitConfig = Schema.Struct({
  id: Schema.String,
  activationMode: Schema.optionalKey(ActivationMode),
})
export type InitConfig = typeof InitConfig.Type

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

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field.
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
