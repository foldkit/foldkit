import {
  Array,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  html,
} from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'

import { idSelector } from '../internal/selectors.js'
import { keyToIndex } from '../keyboard.js'

export { wrapIndex, findFirstEnabledIndex, keyToIndex } from '../keyboard.js'

// MODEL

/** Controls the tab list layout direction and which arrow keys navigate between tabs. */
export const Orientation = S.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Controls whether tabs activate on focus (`Automatic`) or require an explicit selection (`Manual`). */
export const ActivationMode = S.Literals(['Automatic', 'Manual'])
export type ActivationMode = typeof ActivationMode.Type

/** Schema for the tabs component's private interaction state. The active
 *  tab is owned by the parent and passed in via `ViewInputs.selectedValue`,
 *  so it is not stored here. `maybeFocusedIndex` is the roving-tabindex
 *  cursor: `None` means keyboard focus follows the selected tab, and `Manual`
 *  activation stores `Some(index)` while focus diverges from the selection. */
export const Model = S.Struct({
  id: S.String,
  maybeFocusedIndex: S.Option(S.Number),
  activationMode: ActivationMode,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when a tab is selected via click or keyboard. Commits the tab as the
 *  new selection and moves focus onto it. */
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

/** Sent to the parent when a tab is committed via click or keyboard. Carries both the tab's value (typed as `Value` via `Tabs.create<Value>()`) and its index. Generic at the type level; the schema stores `value: string` and the factory's fenced cast types it as `Value`. */
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
 *  `Tabs.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// INIT

/** Configuration for creating a tabs model with `init`. */
export type InitConfig = Readonly<{
  id: string
  activationMode?: ActivationMode
}>

/** Creates an initial tabs model from a config. Focus follows the selected
 *  tab until the user navigates in `Manual` mode, so `maybeFocusedIndex`
 *  starts `None`. Defaults to automatic activation. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  maybeFocusedIndex: Option.none(),
  activationMode: config.activationMode ?? 'Automatic',
})

// UPDATE

const tabId = (id: string, index: number): string => `${id}-tab-${index}`

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

/** Moves focus to the tab at the given index. */
export const FocusTab = Command.define(
  'FocusTab',
  { id: S.String, index: S.Number },
  CompletedFocusTab,
)(({ id, index }) =>
  Dom.focus(idSelector(tabId(id, index))).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusTab()),
  ),
)

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

/** Processes a tabs message and returns the next model, commands, and an
 *  optional OutMessage. `Selected` fires when a tab is committed via click or
 *  keyboard; the parent stores the new value and passes it back in as
 *  `selectedValue`. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      SelectedTab: ({ index, value }) => [
        evo(model, { maybeFocusedIndex: () => Option.none() }),
        [FocusTab({ id: model.id, index })],
        Option.some(Selected({ value, index })),
      ],
      FocusedTab: ({ index }) => [
        evo(model, { maybeFocusedIndex: () => Option.some(index) }),
        [FocusTab({ id: model.id, index })],
        Option.none(),
      ],
      CompletedFocusTab: () => [model, [], Option.none()],
    }),
  )

// VIEW

/** Per-tab render info passed to the consumer's `toView`. Generic over
 *  `Value extends string`: when `Tabs.create<MyUnion>()` is declared,
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

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *  Generic over `Value extends string` so consumers using
 *  `Tabs.create<MyUnion>()` receive `tab.value: MyUnion` in `toView`
 *  and `(value: MyUnion, index) => boolean` in `isTabDisabled`, without
 *  casting.
 *
 *  - `selectedValue`: the active tab, read straight from the parent Model.
 *    `aria-selected`, the `data-selected` marker, and which panel is active
 *    all derive from it. */
export type ViewInputs<Value extends string = string> = Readonly<{
  tabs: ReadonlyArray<Value>
  selectedValue: Value
  ariaLabel: string
  toView: (render: RenderInfo<Value>) => Html
  isTabDisabled?: (value: Value, index: number) => boolean
  orientation?: Orientation
}>

const internalView = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, activationMode, maybeFocusedIndex } = model
    const {
      tabs,
      selectedValue,
      ariaLabel,
      toView,
      isTabDisabled,
      orientation = 'Horizontal',
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

/** Pairs the tabs `view` and `update` behind a single Value-typed entry
 *  point. Declare once at module scope so consumers receive
 *  `tab.value: Value` in `toView` and the `Selected` OutMessage without an
 *  `as` cast:
 *
 *  ```ts
 *  const DemoTabs = Tabs.create<DemoTab>()
 *
 *  // In view (selectedValue is the parent-owned active tab):
 *  h.submodel({ view: DemoTabs.view, viewInputs: { selectedValue, ... }, ... })
 *
 *  // In update, fold the Selected OutMessage into your Model:
 *  const [next, commands, maybeOutMessage] = DemoTabs.update(model, message)
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
  }
}
