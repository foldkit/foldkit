# @foldkit/ui

## 0.128.0

### Minor Changes

- f7c4f17: Breaking: Calendar and DatePicker no longer store the selected date. The parent Model owns an `Option<CalendarDate>`, passes it in per render via `ViewInputs.maybeSelectedDate`, and folds the OutMessages back into its own state. DatePicker gains a `ClearedDate` OutMessage: clearing no longer silently empties internal state, it announces the fact so the parent clears its own field. `InitConfig` replaces `initialSelectedDate` with `initialViewDate`, which only controls the month the calendar opens onto; pass the parent's current value to open onto it. `reflectSelectedDate` is replaced on both components by `focusDate`, which moves the view and cursor to a plain `CalendarDate` without touching the selection. Config reflectors (`reflectMinDate`, `reflectMaxDate`, `reflectDisabledDates`, `reflectDisabledDaysOfWeek`) are unchanged, since bounds and disabled dates remain child configuration. Part of #676.

  ### Migration

  Add a field for the selected date to your Model and seed it in init:

  ```ts
  // Before
  const Model = S.Struct({
    datePicker: DatePicker.Model,
  })

  const init = (today: CalendarDate) => ({
    datePicker: DatePicker.init({
      id: 'due-date',
      today,
      initialSelectedDate: today,
    }),
  })
  ```

  ```ts
  // After
  const Model = S.Struct({
    datePicker: DatePicker.Model,
    maybeDueDate: S.Option(Calendar.CalendarDate),
  })

  const init = (today: CalendarDate) => ({
    datePicker: DatePicker.init({
      id: 'due-date',
      today,
      initialViewDate: today,
    }),
    maybeDueDate: Option.some(today),
  })
  ```

  In update, fold the `SelectedDate` and `ClearedDate` OutMessages into the parent-owned field:

  ```ts
  GotDatePickerMessage: ({ message }) => {
    const [nextDatePicker, datePickerCommands, maybeOutMessage] =
      DatePicker.update(model.datePicker, message)

    const nextMaybeDueDate = Option.match(maybeOutMessage, {
      onNone: () => model.maybeDueDate,
      onSome: M.type<DatePicker.OutMessage>().pipe(
        M.tagsExhaustive({
          SelectedDate: ({ date }) => Option.some(date),
          ClearedDate: () => Option.none(),
          ChangedViewMonth: () => model.maybeDueDate,
        }),
      ),
    })

    return [
      evo(model, {
        datePicker: () => nextDatePicker,
        maybeDueDate: () => nextMaybeDueDate,
      }),
      Command.mapMessages(datePickerCommands, message =>
        GotDatePickerMessage({ message }),
      ),
    ]
  }
  ```

  In view, pass the parent-owned selection back in (Calendar takes the same `maybeSelectedDate` view input):

  ```ts
  h.submodel({
    slotId: model.datePicker.id,
    model: model.datePicker,
    view: DatePicker.view,
    viewInputs: {
      anchor,
      maybeSelectedDate: model.maybeDueDate,
      triggerContent,
      toCalendarView,
    },
    toParentMessage: message => GotDatePickerMessage({ message }),
  })
  ```

  Callers of `reflectSelectedDate` should set the parent-owned field and, when the picker should open onto the new date, call `focusDate`:

  ```ts
  // Before
  evo(model, {
    datePicker: DatePicker.reflectSelectedDate(Option.some(date)),
  })
  ```

  ```ts
  // After
  evo(model, {
    maybeDueDate: () => Option.some(date),
    datePicker: DatePicker.focusDate(date),
  })
  ```

- 9d09804: Breaking: `Combobox` and `Combobox.Multi` no longer store the selection. The Submodel Model kept a copy of a value the parent Model already owned. The Model now holds interaction state only, including `inputValue`, the transient text being typed. The selection lives in the parent Model, flows into the view each render (`ViewInputs.maybeSelectedValue` for single-select, `ViewInputs.selectedValues` for multi-select) together with `restingInputValue` (the text the input rests at when the combobox closes), and comes back out as OutMessages the parent folds.

  API changes:

  - `Combobox.Model` drops `maybeSelectedItem` and `maybeSelectedDisplayText`; `Combobox.Multi.Model` drops `selectedItems`. `inputValue` stays.
  - `init` no longer accepts `selectedItem`, `selectedDisplayText`, or `selectedItems`. Seed the parent field instead.
  - `ViewInputs` gains a required selection input and `restingInputValue: string`. Single-select takes `maybeSelectedValue: Option<Item>`, multi-select takes `selectedValues: ReadonlyArray<Item>`. For single-select, `restingInputValue` is the selection's display text, or empty. The multi-select input always rests empty on close, so multi consumers pass `''`.
  - The `Selected` OutMessage drops `wasAdded`. It carries only the activated `value`; the parent decides what activation means (single-select stores it, multi-select toggles membership).
  - New `ClearedSelection` OutMessage: sent when a nullable combobox closes with an empty input. The parent clears the selection it owns. `OutMessage` is now the union of `Selected` and `ClearedSelection`, so exhaustive folds must handle both tags.
  - Close-path Messages carry the resting text as a payload fact: `Closed`, `BlurredInput`, and `PressedToggleButton` now have a `restingInputValue: string` payload, and `SelectedItem` carries `wasSelected: boolean` so nullable deselect works without the Model knowing the selection. The view computes these payloads from `ViewInputs`.
  - `Closed` and `BlurredInput` are no-ops while the combobox is already closed, so a stale close dispatch baked from an old render cannot rewrite `inputValue` or re-emit `ClearedSelection`.
  - `Combobox.close(model, restingInputValue)` now takes the resting text. `Combobox.Multi.close(model)` keeps its signature; the multi input always rests empty.
  - Immediate mode (`immediate: true`) now emits `Selected` on every keyboard activation while open, so arrow keys commit as they move. Combining `immediate` with `nullable` is discouraged: a toggle fold would deselect as the arrows pass back over the selected item.
  - The multi-select hidden form inputs now submit the full parent-owned selection, not just the selected items present in the currently filtered list.

  ### Migration

  Own the selection in the parent Model and stop seeding it through `init`. Declaring the values as an `S.Literals` Schema keeps the field literal-typed end to end:

  ```ts
  // Before
  const Model = S.Struct({
    cityCombobox: Combobox.Model,
  })

  const init = (): Model => ({
    cityCombobox: Combobox.init({ id: 'city-combobox', selectedItem: 'Kyiv' }),
  })

  // After
  const City = S.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
  type City = typeof City.Type

  const CityCombobox = Combobox.create<City>()

  const Model = S.Struct({
    cityCombobox: Combobox.Model,
    maybeSelectedCity: S.Option(City),
  })

  const init = (): Model => ({
    cityCombobox: Combobox.init({ id: 'city-combobox' }),
    maybeSelectedCity: Option.some('Kyiv'),
  })
  ```

  Pass the selection and the resting text into the view. Single-select passes an `Option` as `maybeSelectedValue`; multi-select passes its full array as `selectedValues` and `restingInputValue: ''`:

  ```ts
  h.submodel({
    model: model.cityCombobox,
    view: CityCombobox.view,
    viewInputs: {
      items: filteredCities,
      maybeSelectedValue: model.maybeSelectedCity,
      restingInputValue: Option.getOrElse(model.maybeSelectedCity, () => ''),
      itemToValue: city => city,
      itemToDisplayText: city => city,
      itemToConfig: cityItemConfig,
    },
    toParentMessage: message => GotCityComboboxMessage({ message }),
  })
  ```

  Fold the OutMessages into the selection you own. `ClearedSelection` only fires for nullable comboboxes; a nullable fold clears the field as shown below, while a non-nullable fold keeps its selection in that arm since it can never fire. Either way the match stays exhaustive:

  ```ts
  GotCityComboboxMessage: ({ message }) => {
    const [nextCombobox, commands, maybeOutMessage] = CityCombobox.update(
      model.cityCombobox,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotCityComboboxMessage({ message }),
    )

    return Option.match(maybeOutMessage, {
      onNone: () => [
        evo(model, { cityCombobox: () => nextCombobox }),
        mappedCommands,
      ],
      onSome: M.type<Combobox.OutMessage<City>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => [
            evo(model, {
              cityCombobox: () => nextCombobox,
              maybeSelectedCity: () => Option.some(value),
            }),
            mappedCommands,
          ],
          ClearedSelection: () => [
            evo(model, {
              cityCombobox: () => nextCombobox,
              maybeSelectedCity: () => Option.none(),
            }),
            mappedCommands,
          ],
        }),
      ),
    })
  }
  ```

  Multi-select folds `Selected` by toggling the value's membership in its array, exactly as the Listbox migration shows.

  Callers of `reflectSelectedItem`/`reflectSelectedItems` delete the reflect call and read the selection from the state that already owned it.

  Part of #676.

- 9fe90d6: Make `Checkbox`, `Switch`, and `Disclosure` stateless controlled render helpers and remove their Submodel forms. Following `RadioGroup`, each holds only the value the parent already owns (`isChecked` / `isOpen`), so the Submodel Model was a mirror carrying a reflect-on-every-transition sync obligation. Each now exposes a single `view(ViewConfig)`:

  - `Checkbox.view` / `Switch.view` take `isChecked` and dispatch `onToggle(isChecked)` with the new state.
  - `Disclosure.view` takes `isOpen` and dispatches `onToggle(isOpen)`, and still exposes `buttonId` plus the `animatePanel` helper.

  The parent owns the state and just stores the value in `update`. There is no focus Command: Disclosure's toggle is button-driven so focus stays on the button, and a programmatic open/close should not steal focus.

  BREAKING: `Model`, `init`, `update`, `setChecked`, `reflectChecked` (Checkbox/Switch), `toggle`, `close`, `reflectOpenState`, `FocusButton`, `CompletedFocusButton` (Disclosure), the `OutMessage`/`Message`/`Toggled`/`SetChecked`/`Closed`/`ToggledChecked`/`ToggledOpenState` schemas, and the `InitConfig`/`ViewInputs` types are removed from all three. Move each usage to a parent-owned Model field rendered with `view`: store the value, handle the `onToggle` Message in `update`, and delete the `Got*` plumbing. Your `toView` markup moves over unchanged; the attribute bundles keep their names and contents. A "select all" now sets the child fields directly instead of calling `setChecked`. Part of #676.

  Before, with the Submodel form:

  ```ts
  // model
  acceptTerms: Checkbox.Model,

  // view
  h.submodel({
    slotId: 'accept-terms',
    model: model.acceptTerms,
    view: Checkbox.view,
    viewInputs: { toView: attributes => ... },
    toParentMessage: message => GotAcceptTermsMessage({ message }),
  })

  // update: delegate to Checkbox.update, then match the ToggledChecked
  // OutMessage to read the new value
  ```

  After, with the controlled helper:

  ```ts
  // model
  acceptedTerms: S.Boolean,

  // view
  Checkbox.view<Message>({
    id: 'accept-terms',
    isChecked: model.acceptedTerms,
    onToggle: isChecked => ToggledTerms({ isChecked }),
    toView: attributes => ...,
  })

  // update
  ToggledTerms: ({ isChecked }) => [
    evo(model, { acceptedTerms: () => isChecked }),
    [],
  ],
  ```

- 9d09804: Breaking: `Listbox` and `Listbox.Multi` no longer store the selection. The Submodel Model kept a copy of a value the parent Model already owned, so every app carried two sources of truth and had to keep them in sync. The Model now holds interaction state only (open/closed, active item, activation trigger, typeahead search). The selection lives in the parent Model, flows into the view each render (`ViewInputs.maybeSelectedValue` for single-select, `ViewInputs.selectedValues` for multi-select), and comes back out as a neutral `Selected({ value })` OutMessage the parent folds: single-select stores the value, multi-select toggles the value's membership.

  API changes:

  - `Listbox.Model` drops `maybeSelectedItem`; `Listbox.Multi.Model` drops `selectedItems`.
  - `Listbox.init` no longer accepts `selectedItem`; `Listbox.Multi.init` no longer accepts `selectedItems`. Seed the parent field instead.
  - `ViewInputs` gains a required selection input: single-select takes `maybeSelectedValue: Option<Value>`, multi-select takes `selectedValues: ReadonlyArray<Value>`. It drives `aria-selected` and `data-selected` on items, which item the Listbox highlights when it opens onto a selection, and the hidden form inputs submitted under `name`.
  - The `Selected` OutMessage drops `wasAdded`. It now carries only the activated `value`; the parent owns the selection and decides what activation means.
  - `reflectSelectedItem` and `reflectSelectedItems` are removed from both variants and from `create`. To mirror external truth (a URL parameter, restored storage, a server push), update the parent field that owns the selection. The Listbox has nothing left to sync.

  ### Migration

  Own the selection in the parent Model and stop seeding it through `init`. Declaring the values as an `S.Literals` Schema keeps the field literal-typed end to end:

  ```ts
  // Before
  const Model = S.Struct({
    planListbox: Listbox.Model,
  })

  const init = (): Model => ({
    planListbox: Listbox.init({ id: 'plan-listbox', selectedItem: 'Pro' }),
  })

  // After
  const Plan = S.Literals(['Free', 'Pro', 'Enterprise'])
  type Plan = typeof Plan.Type

  const PlanListbox = Listbox.create<Plan>()

  const Model = S.Struct({
    planListbox: Listbox.Model,
    maybeSelectedPlan: S.Option(Plan),
  })

  const init = (): Model => ({
    planListbox: Listbox.init({ id: 'plan-listbox' }),
    maybeSelectedPlan: Option.some('Pro'),
  })
  ```

  Pass the selection into the view. Single-select passes an `Option` as `maybeSelectedValue`, multi-select passes its full array as `selectedValues`:

  ```ts
  h.submodel({
    model: model.planListbox,
    view: PlanListbox.view,
    viewInputs: {
      items: plans,
      maybeSelectedValue: model.maybeSelectedPlan,
      itemToConfig: planItemConfig,
      buttonContent: planButtonContent(model.maybeSelectedPlan),
    },
    toParentMessage: message => GotPlanListboxMessage({ message }),
  })
  ```

  Fold the OutMessage into the selection you own. Single-select stores the value:

  ```ts
  GotPlanListboxMessage: ({ message }) => {
    const [nextListbox, commands, maybeOutMessage] = PlanListbox.update(
      model.planListbox,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotPlanListboxMessage({ message }),
    )

    return Option.match(maybeOutMessage, {
      onNone: () => [
        evo(model, { planListbox: () => nextListbox }),
        mappedCommands,
      ],
      onSome: M.type<Listbox.OutMessage<Plan>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => [
            evo(model, {
              planListbox: () => nextListbox,
              maybeSelectedPlan: () => Option.some(value),
            }),
            mappedCommands,
          ],
        }),
      ),
    })
  }
  ```

  Multi-select folds the same OutMessage by toggling membership, replacing the removed `wasAdded` branch:

  ```ts
  // Before
  Selected: ({ value, wasAdded }) => [
    evo(model, {
      peopleListbox: () => nextListbox,
      selectedPeople: () =>
        wasAdded
          ? Array.append(model.selectedPeople, value)
          : Array.filter(model.selectedPeople, person => person !== value),
    }),
    mappedCommands,
  ],

  // After
  Selected: ({ value }) => [
    evo(model, {
      peopleListbox: () => nextListbox,
      selectedPeople: () =>
        Array.contains(model.selectedPeople, value)
          ? Array.filter(model.selectedPeople, person => person !== value)
          : Array.append(model.selectedPeople, value),
    }),
    mappedCommands,
  ],
  ```

  Callers of `reflectSelectedItem`/`reflectSelectedItems` delete the reflect call and read the selection from the state that already owned it.

  Part of #676.

- 8dd1906: Make `RadioGroup` a stateless controlled render helper and remove the Submodel form. `RadioGroup.view` takes a `ViewConfig` (`id`, `selectedValue`, `options`, `onSelect`, `ariaLabel`, `orientation`, `toView`, plus the optional `isOptionDisabled`, `isDisabled`, and `name`) and dispatches the parent's own Message through `onSelect(value)`. The parent owns the selection, so there is no mirrored `selectedValue` to keep in sync. Moving focus onto the newly-selected option is the radio group's own concern now: it happens inside the component's click and keydown handlers (via `OnClickFocus` and the new `OnKeyDownFocus`), so the parent's `update` only stores the value. There is no focus command or acknowledgement to wire.

  BREAKING: `RadioGroup.Model`, `init`, `update`, `select`, `create`, `reflectSelectedValue`, `FocusOption`, `CompletedFocusOption`, `SelectedOption`, `Selected`, `OutMessage`, `Message`, and the `InitConfig`/`ViewInputs` types are removed. Move each usage to a parent-owned selection field rendered with `RadioGroup.view`: store the value in your Model, handle the `onSelect` Message in `update`, and delete the `Got*` plumbing. A radio group is a select with different rendering, so it now sits with `Select`, `Input`, and `Textarea` as a controlled helper rather than a Submodel.

- f7c4f17: Breaking: Slider no longer stores its value. The parent Model owns the value, passes it in per render via `ViewInputs.value`, and folds the `ChangedValue` OutMessage back into its own state. The component keeps only private interaction state (`min`/`max`/`step` configuration and the drag phase), so the value cannot drift from parent truth. `InitConfig` drops `initialValue`; seed the parent-owned field instead, conforming it with the newly exported `snapAndClamp(value, min, max, step)`. `reflectValue` is removed; update the parent-owned field directly. `fractionOfValue` now takes `(value, min, max)` instead of a Model. `reflectRange` still reflects an externally-driven range onto the component but no longer clamps a stored value; clamp the parent-owned value with `snapAndClamp` in the same update. Part of #676.

  ### Migration

  Add a field for the value to your Model and seed it in init:

  ```ts
  // Before
  const Model = S.Struct({
    volumeSlider: Slider.Model,
  })

  const init = () => ({
    volumeSlider: Slider.init({
      id: 'volume',
      min: 0,
      max: 1,
      step: 0.05,
      initialValue: 0.5,
    }),
  })
  ```

  ```ts
  // After
  const Model = S.Struct({
    volumeSlider: Slider.Model,
    volume: S.Number,
  })

  const init = () => ({
    volumeSlider: Slider.init({ id: 'volume', min: 0, max: 1, step: 0.05 }),
    volume: Slider.snapAndClamp(0.5, 0, 1, 0.05),
  })
  ```

  In update, fold the `ChangedValue` OutMessage into the parent-owned field:

  ```ts
  GotVolumeSliderMessage: ({ message }) => {
    const [nextVolumeSlider, sliderCommands, maybeOutMessage] = Slider.update(
      model.volumeSlider,
      message,
    )

    const nextVolume = Option.match(maybeOutMessage, {
      onNone: () => model.volume,
      onSome: M.type<Slider.OutMessage>().pipe(
        M.tagsExhaustive({
          ChangedValue: ({ value }) => value,
        }),
      ),
    })

    return [
      evo(model, {
        volumeSlider: () => nextVolumeSlider,
        volume: () => nextVolume,
      }),
      Command.mapMessages(sliderCommands, message =>
        GotVolumeSliderMessage({ message }),
      ),
    ]
  }
  ```

  In view, pass the parent-owned value back in:

  ```ts
  h.submodel({
    slotId: model.volumeSlider.id,
    model: model.volumeSlider,
    view: Slider.view,
    viewInputs: {
      value: model.volume,
      ariaLabel: 'Volume',
      toView,
    },
    toParentMessage: message => GotVolumeSliderMessage({ message }),
  })
  ```

- f7c4f17: Breaking: Tabs no longer stores the active tab. The parent Model owns the selected value, passes it in per render via `ViewInputs.selectedValue`, and folds the `Selected` OutMessage back into its own state. The component keeps only private interaction state (the roving keyboard-focus cursor and the activation mode), so there is no second copy of the selection to drift from parent truth. `InitConfig` drops `activeIndex`, and `selectTab` and `reflectSelectedTab` are removed; to change the active tab, update the parent-owned field directly. Part of #676.

  ### Migration

  Add a field for the active tab to your Model and seed it in init:

  ```ts
  // Before
  const Model = S.Struct({
    tabs: Tabs.Model,
  })

  const init = () => ({
    tabs: Tabs.init({ id: 'framework-tabs', activeIndex: 0 }),
  })
  ```

  ```ts
  // After
  const Model = S.Struct({
    tabs: Tabs.Model,
    activeFramework: Framework,
  })

  const init = () => ({
    tabs: Tabs.init({ id: 'framework-tabs' }),
    activeFramework: 'Foldkit',
  })
  ```

  In update, fold the `Selected` OutMessage into the parent-owned field:

  ```ts
  GotTabsMessage: ({ message }) => {
    const [nextTabs, tabsCommands, maybeOutMessage] = FrameworkTabs.update(
      model.tabs,
      message,
    )

    const nextActiveFramework = Option.match(maybeOutMessage, {
      onNone: () => model.activeFramework,
      onSome: M.type<Tabs.OutMessage<Framework>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => value,
        }),
      ),
    })

    return [
      evo(model, {
        tabs: () => nextTabs,
        activeFramework: () => nextActiveFramework,
      }),
      Command.mapMessages(tabsCommands, message => GotTabsMessage({ message })),
    ]
  }
  ```

  In view, pass the parent-owned value back in:

  ```ts
  h.submodel({
    slotId: model.tabs.id,
    model: model.tabs,
    view: FrameworkTabs.view,
    viewInputs: {
      tabs: frameworks,
      selectedValue: model.activeFramework,
      ariaLabel: 'Framework comparison',
      toView,
    },
    toParentMessage: message => GotTabsMessage({ message }),
  })
  ```

- 080b391: Add `Toast.test.drainEntry` for Story tests. Showing a toast emits a multi-step animation and dismiss lifecycle, and a Story test must resolve every emitted Command or it fails on leftover Commands. The helper builds the `Story.Command.resolveAll` step that drains a single entry end to end: enter animation, settle, auto-dismiss, exit animation, settle. Each step resolves with the child's raw result Message, so `resolveAll` replays the matched Command's own wrapping and a parent that embeds the toast Submodel drains the same way. The lifecycle knowledge now lives in one place instead of being hand-rolled in each test.

## 0.127.0

### Minor Changes

- 6ebe07f: Add an `initialFocus` attribute group to Dialog's `RenderInfo`. Spread it onto the element that should receive focus when the dialog opens. `focusSelector` targets an element whose id you do not own, or a descendant selector, and takes precedence when both are set.

## 0.126.0

### Patch Changes

- 86d0c9f: `Ui.Tooltip` no longer hides when the trigger is pressed. Tooltips hide only on pointer-leave, blur, or Escape. Escape still suppresses re-opening until the user disengages.

  `PressedPointerOnTrigger` now carries only `pointerType`; the `button` field is removed, since it was only used to detect the left-click dismissal that was removed. The message still records the pointer type so the focus that follows a mouse press can be told apart from focus that affirms the tooltip (keyboard, touch, or pen).

## 0.125.0

## 0.124.0

### Minor Changes

- c395720: Add `Ui.Nav`, a stateless, headless primitive for URL-driven navigation. It renders a navigation landmark whose items are links, marking the current destination with `aria-current="page"`, derived from an `isItemCurrent` predicate the consumer drives from the URL. Reach for `Ui.Tabs` instead when switching content within a single page.

## 0.123.0

## 0.122.1

### Patch Changes

- ca64832: Typecheck test files. Each package's `typecheck` script now checks the project that includes tests instead of the build project that excludes them. No runtime changes.

## 0.122.0

### Minor Changes

- 0460a48: Hand the Dialog's title and description ids to the consumer through `RenderInfo`
  so they are never hand-rolled.

  `RenderInfo` gains `title` and `description` attribute groups (siblings of
  `dialog` / `backdrop` / `panel` / `closeButton`). Spread them onto your heading
  and description elements:

  ```ts
  toView: ({ dialog, backdrop, panel, title, description, closeButton }) => ...
  h.h2([...title], ['My dialog'])
  h.p([...description], ['...'])
  ```

  The dialog's own `aria-labelledby` / `aria-describedby` point at the same
  framework-managed ids, so labelling wires up without the consumer constructing
  any id. This removes the class of bug where a consumer independently built a
  dialog-scoped id such as `${dialogId}-title` for a form field literally called
  "title" and silently collided with the dialog's own heading id.

  Migration: destructure `title` / `description` from the `toView` render info and
  spread them, instead of `h.Id(Dialog.titleId(model))` / `descriptionId`. The
  `Dialog.titleId` / `Dialog.descriptionId` helpers remain as an escape hatch for
  referencing the id as a value outside `toView` (a Command calling
  `getElementById`, a cross-element reference, or a test).

  Defense in depth alongside the `RenderInfo` change:

  - The reserved ids are namespaced. The helpers and rendered ids now use the
    `-dialog-title` / `-dialog-description` suffixes rather than the bare `-title`
    / `-description`, so even a hand-rolled id is far less likely to collide.
  - The runtime gains a development-only diagnostic: it scans the
    Foldkit-rendered root for elements sharing an `id` and emits a
    `[foldkit]`-prefixed `console.warn` naming the duplicated id. The scan is
    coalesced on a trailing timer so rapid successive renders trigger at most one
    full-tree scan per second, warns once per id, is scoped to the app root, never
    throws, and is tree-shaken out of production builds.

## 0.121.0

### Minor Changes

- 1a0d7fc: Bring external-label support to the remaining trigger-based `@foldkit/ui`
  components, matching the `Ui.Listbox` trigger.

  `Ui.Combobox`, `Ui.Menu`, `Ui.DatePicker`, `Ui.Popover`, `Ui.Tooltip`, and
  `Ui.Disclosure` now accept optional `ariaLabel` and `ariaLabelledBy` on their
  view inputs. When provided, they are applied to the component's trigger
  element (the input for Combobox, the button for the rest), with `ariaLabel`
  taking precedence. Neither attribute is emitted when omitted, so a trigger
  never carries a dangling `aria-labelledby`.

  Each component also exposes a bare-id helper that mirrors its internal id
  convention, so a native `<label for=...>` can target the trigger without
  hardcoding the suffix: `Combobox.inputId(id)` (and `Combobox.Multi.inputId(id)`),
  `Menu.buttonId(id)`, `DatePicker.triggerId(id)`, `Popover.buttonId(id)`,
  `Tooltip.triggerId(id)`, and `Disclosure.buttonId(id)`.

### Patch Changes

- f3dee68: Clarify the Dialog docstrings about how the native `<dialog>` is opened. The
  `ShowDialog` command and the component view go through `Dom.showDialog`, which
  calls `show()` rather than native `showModal()` so other high-z-index overlays
  stay interactive. The docs now describe the high z-index, focus trap,
  component-supplied backdrop, and `cancel` event on Esc instead of implying
  native modal semantics.

## 0.120.0

### Minor Changes

- d17a0e5: Add a first-class way to associate an external label with the `Ui.Listbox`
  trigger button.

  `ViewInputs` now accepts optional `ariaLabel` and `ariaLabelledBy`. When
  provided, they are applied to the trigger button, with `ariaLabel` taking
  precedence. Neither attribute is rendered when omitted, so the trigger never
  carries a dangling `aria-labelledby`. `Listbox.buttonId(id)` (and
  `Listbox.Multi.buttonId(id)`) returns the bare id of the trigger button,
  mirroring the existing `buttonSelector`, so a native
  `<label for={Listbox.buttonId(id)}>` can drive click-to-focus without
  hardcoding the internal `-button` convention.

- 4405bd2: Rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
  `Dom.closeDialog`.

  The old names implied native `HTMLDialogElement.showModal()` semantics, but
  `Dom.showModal` deliberately calls `element.show()` plus a manual focus trap
  and a high z-index so DevTools and other overlays stay interactive above the
  dialog. `Dom.closeModal` wraps native `.close()`. The new names drop the
  misnomer and match the already-`Dialog`-flavored internals and the `Ui.Dialog`
  Commands.

  Migration: rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
  `Dom.closeDialog` at every call site. Behavior is unchanged.

## 0.119.0

### Minor Changes

- c1a545c: Add `h.OnUnmount(message)` and auto-release `Ui.Dialog` resources when the
  dialog element unmounts.

  `h.OnUnmount(message)` is a new Html attribute that dispatches a Message when
  its element is removed from the DOM by a structural patch (a key change, a
  parent re-render that drops it, route navigation away from its subtree). It
  binds to snabbdom's `destroy` hook, so the resulting Message flows through
  `update` like any other fact. When the element belongs to a Submodel, the
  boundary wrapping chain is resolved eagerly at render time, so the Message
  still reaches the parent even though the Submodel boundary is torn down in the
  same patch. It is replay-safe: the runtime suppresses the dispatch during a
  DevTools time-travel render, so scrubbing through history never re-runs the
  cleanup.

  `Ui.Dialog` uses this as a backstop. Previously, unmounting an open dialog
  without a purposeful close (the classic case being navigation away from a
  route-keyed subtree that contains it) left page scroll locked and the
  focus-trap keyboard listener installed, and could leave the Model reading a
  stale `isOpen: true`. The dialog now emits `Unmounted` on structural unmount,
  which resets the Model to a clean closed state and runs a hygiene-only
  `ReleaseDialogResources` Command (release scroll lock, restore focus, remove
  the keydown listener). The view only attaches the backstop while the dialog is
  visible (open or mid-leave), so navigating a page full of closed dialogs does
  not flood the message log. This backstop is silent: it does not emit the
  `Closed` OutMessage, run consumer close Commands, or play a leave animation. The
  purposeful close path (Escape, backdrop, close button) is unchanged. The
  cleanup is idempotent and releases the shared scroll lock exactly once, so a
  normal close followed by an unmount never double-releases.

  A new `Dom.releaseDialogResources(id)` Effect performs the idempotent,
  hygiene-only release and is exported from `foldkit/dom`. It is addressed by the
  dialog's id, not a selector, because the element is typically already gone from
  the DOM by the time the backstop runs. Because this cleanup is now keyed by id
  rather than by element, a dialog's id must be non-empty and unique within the
  document.

- 1a0a454: Add `animatePanel` to the `Ui.Disclosure` attribute bundle, so disclosures can
  animate their expand and collapse. It wraps panel content in a CSS-grid
  container that transitions height (`grid-template-rows: 0fr → 1fr` with
  `overflow: hidden`), keeping the panel mounted while collapsed so the transition
  has something to animate from and to. Render the panel unconditionally and pass
  it through `attributes.animatePanel` instead of gating it on `isOpen`. The
  collapsed content is marked `aria-hidden`. Mirrors the `Ui.Animation`
  `animateSize` flag.

## 0.118.0

## 0.117.0

### Minor Changes

- 1795e0e: Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

  Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
  pnpm add -D @effect/vitest@4.0.0-beta.88
  ```

## 0.116.0

## 0.115.0

## 0.114.1

### Patch Changes

- d2bed68: Make anchored overlays (Listbox, Menu, Combobox, Popover) work when the app is
  mounted inside a shadow root, such as the DevTools overlay. The panel portals
  into the element's containing root instead of always `document.body` (keeping its
  scoped styles), resolves its anchor button and focus target within that root
  (`document.getElementById`/`querySelector` do not pierce shadow boundaries), and
  positions with Floating UI's `fixed` strategy in a shadow context (the `absolute`
  strategy mismeasures against the shadow host as `offsetParent`). Light-DOM apps
  are unchanged.

## 0.114.0

## 0.113.1

## 0.113.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 32fd9cb: Drop the unused `@effect/platform-browser` peer dependency from `@foldkit/ui`
  and `@foldkit/devtools`. Neither package imports it, and consumers still
  receive it transitively through `foldkit`, which does use it.

## 0.112.5

### Patch Changes

- 1684a0c: Escape element ids before using them as CSS selectors. Components that focus or
  observe their own elements (Listbox, Combobox, Menu, Popover, Dialog, DatePicker,
  Calendar, RadioGroup, Tabs, Disclosure, and animated overlays) built selectors as
  `#${id}`, which threw a `querySelector` SyntaxError when the id was not a valid CSS
  identifier on its own. Ids beginning with a digit, such as UUID-prefixed ids, now
  work.

## 0.112.4

## 0.112.3

## 0.112.2

## 0.112.1

## 0.112.0

### Minor Changes

- a481ddb: Split UI components and the in-browser DevTools overlay out of core.

  The 24 UI components move from `foldkit/ui/*` to the new `@foldkit/ui` package, and the DevTools overlay moves to the new `@foldkit/devtools` package. Breaking changes in either no longer force a core version bump.

  Migration:
  - Component usage moves to named imports from the new package: `import { Ui } from 'foldkit'` with `Ui.Button.view(...)` becomes `import { Button } from '@foldkit/ui'` with `Button.view(...)`. The `foldkit/ui/button` subpath becomes `@foldkit/ui/button`. Add `@foldkit/ui` to your dependencies. When a component name collides with another import (for example core's `Calendar`), alias it: `import { Calendar as UiCalendar } from '@foldkit/ui'`.
  - The DevTools overlay is now opt-in. `devTools: true` (or a `devTools` config object) still records history and serves the WebSocket bridge for the DevTools MCP server, but no longer mounts the in-browser panel on its own. To show the panel, install `@foldkit/devtools` and pass its overlay factory:

    ```ts
    import { overlay } from '@foldkit/devtools'

    Runtime.makeApplication({
      // ...
      devTools: { Message, overlay },
    })
    ```

  New public surface on core to support the split: the `foldkit/submodel` subpath, `foldkit/devtools-host` (the instrumentation API the overlay builds on), and `DevToolsOverlay` / `DevToolsPosition` from `foldkit/runtime`.
