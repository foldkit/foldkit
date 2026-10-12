---
'@foldkit/ui': minor
---

Provide each Foldkit UI component's handler Layers and register its Mount definitions. The application module that owns a component composes that component's `EffectsLayer`; when the component exports `mounts`, the same module carries those registrations to `Application.make`.

The following migration is for an application that renders `Menu` and `Tabs`. `Menu` owns Commands and Mounts. `Tabs` owns Commands but no Mounts.

**Before**

```ts
const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container,
})

Runtime.run(application)
```

**After**

```ts
const application = Application.make({
  Model,
  init,
  update,
  view,
  container,
  // Menu's mounted views require these registrations; Tabs has none.
  mounts: Menu.mounts,
})

// Compose only the components owned by this application module.
const EffectsLayer = Layer.mergeAll(Menu.EffectsLayer, Tabs.EffectsLayer)
const AppLayer = EffectsLayer

pipe(application, Application.provide(AppLayer), Runtime.run)
```

Import `Layer` and `pipe` from `effect`, `Application` and `Runtime` from `foldkit`, and `Menu` and `Tabs` from `@foldkit/ui`. Building the Layers installs no event listeners or DOM behavior. A Command invocation or registered lifecycle starts the work. When a child Submodel renders a component, compose that component's `EffectsLayer` and export its `mounts` from the child boundary; the root combines the child exports rather than maintaining a package-wide component list.

Mounted UI views now preserve their Mount requirements through `h.submodel` and their attribute slots. An owning Submodel must carry those requirements in its exported view as well as register the definitions:

**Before**

```ts
const AppMenu = Menu.create<string>()

export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.submodel({
    slotId: model.menu.id,
    model: model.menu,
    view: AppMenu.view,
    viewInputs: menuViewInputs,
    toParentMessage: message => Message.GotMenuMessage({ message }),
  }),
)
```

**After**

```ts
const AppMenu = Menu.create<string>()

export const mounts = Menu.mounts
export const EffectsLayer = Menu.EffectsLayer

export const view = Submodel.defineView<
  Model,
  Message,
  void,
  // Carry Menu's Mount requirements through this exported parent view.
  Mount.RequirementsOf<typeof mounts>
>((model, h) =>
  h.submodel({
    slotId: model.menu.id,
    model: model.menu,
    view: AppMenu.view,
    viewInputs: menuViewInputs,
    toParentMessage: message => Message.GotMenuMessage({ message }),
  }),
)
```

Import `Mount` and `Submodel` from `foldkit`. This pair assumes the module already declares the Menu's `menuViewInputs` and parent Message wrapper. Keep `void` when the owning view has no inputs, or use its `ViewInputs` type there. TypeScript rejects the parent application if these Mount registrations are missing. Pure UI views retain their existing signatures. For explicit slot annotations, use the component's attribute types, such as `Dialog.RenderInfo['dialog']`, so mounted slots retain their requirements.

Give factory instances stable names. Replace `Toast.make(payloadSchema)` with `Toast.make(name, payloadSchema)` and `Slider.subscriptionsForRoot(getTrackRoot)` with `Slider.forRoot(name, getTrackRoot)`. Compose each returned instance's `EffectsLayer` and register its `subscriptions` where that instance is owned. Instance names must be distinct within an application. Scene swipe events use `Subscription.emit(toast.subscriptions.swipePointer, message)` with the factory instance's registration.

For a Toast instance, keep its lifted Subscriptions in the owning Submodel's registration graph and add its returned effect bundle. This example assumes the Model stores the Toast Model in `model.toast`, the Message union declares `GotToastMessage`, and `App` exports the module's other Subscriptions and `EffectsLayer`.

**Before**

```ts
const toast = Toast.make(ToastPayload)

const toastSubscriptions = Subscription.lift(toast.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.toast),
  toParentMessage: message => Message.GotToastMessage({ message }),
})

const subscriptions = Subscription.aggregate(
  App.subscriptions,
  toastSubscriptions,
)
```

**After**

```ts
// Stable instance names distinguish factory-owned handler requirements.
const toast = Toast.make('AppToast', ToastPayload)

const toastSubscriptions = Subscription.lift(toast.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.toast),
  toParentMessage: message => Message.GotToastMessage({ message }),
})

const subscriptions = Subscription.aggregate(
  App.subscriptions,
  toastSubscriptions,
)

// Lift registrations as before, and carry the instance's handler bundle upward.
const EffectsLayer = Layer.mergeAll(App.EffectsLayer, toast.EffectsLayer)
```

`Slider.forRoot` returns the same pair for a custom track root. This example assumes the Model stores the Slider Model in `model.settingsSlider` and the Message union declares `GotSettingsSliderMessage`.

**Before**

```ts
const sliderSubscriptions = Slider.subscriptionsForRoot(getTrackRoot)

const settingsSliderSubscriptions = Subscription.lift({
  settingsSliderPointer: sliderSubscriptions.dragPointer,
  settingsSliderEscape: sliderSubscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.settingsSlider),
  toParentMessage: message => Message.GotSettingsSliderMessage({ message }),
})

const subscriptions = Subscription.aggregate(
  App.subscriptions,
  settingsSliderSubscriptions,
)
```

**After**

```ts
// The named instance packages the custom-root Subscriptions and their handlers.
const slider = Slider.forRoot('SettingsSlider', getTrackRoot)

const settingsSliderSubscriptions = Subscription.lift({
  settingsSliderPointer: slider.subscriptions.dragPointer,
  settingsSliderEscape: slider.subscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.settingsSlider),
  toParentMessage: message => Message.GotSettingsSliderMessage({ message }),
})

const subscriptions = Subscription.aggregate(
  App.subscriptions,
  settingsSliderSubscriptions,
)

const EffectsLayer = Layer.mergeAll(App.EffectsLayer, slider.EffectsLayer)
```

Update direct Command references using this table. Corresponding `Message.Completed*` variants include the same component name; for example, `Menu.Message.CompletedLockScroll` becomes `Menu.Message.CompletedLockMenuScroll`. Shared result facts such as `EndedAnimation` keep their names.

| Previous Command                        | New Command                                     |
| --------------------------------------- | ----------------------------------------------- |
| `Menu.LockScroll`                       | `Menu.LockMenuScroll`                           |
| `Menu.UnlockScroll`                     | `Menu.UnlockMenuScroll`                         |
| `Menu.InertOthers`                      | `Menu.InertMenuOthers`                          |
| `Menu.RestoreInert`                     | `Menu.RestoreMenuInert`                         |
| `Menu.FocusItems`                       | `Menu.FocusMenuItems`                           |
| `Menu.FocusButton`                      | `Menu.FocusMenuButton`                          |
| `Menu.ScrollIntoView`                   | `Menu.ScrollMenuItemIntoView`                   |
| `Menu.ClickItem`                        | `Menu.ClickMenuItem`                            |
| `Menu.DelayClearSearch`                 | `Menu.DelayClearMenuSearch`                     |
| `Menu.DetectMovementOrAnimationEnd`     | `Menu.DetectMenuMovementOrAnimationEnd`         |
| `Listbox.LockScroll`                    | `Listbox.LockListboxScroll`                     |
| `Listbox.UnlockScroll`                  | `Listbox.UnlockListboxScroll`                   |
| `Listbox.InertOthers`                   | `Listbox.InertListboxOthers`                    |
| `Listbox.RestoreInert`                  | `Listbox.RestoreListboxInert`                   |
| `Listbox.FocusButton`                   | `Listbox.FocusListboxButton`                    |
| `Listbox.FocusItems`                    | `Listbox.FocusListboxItems`                     |
| `Listbox.ScrollIntoView`                | `Listbox.ScrollListboxItemIntoView`             |
| `Listbox.ClickItem`                     | `Listbox.ClickListboxItem`                      |
| `Listbox.DelayClearSearch`              | `Listbox.DelayClearListboxSearch`               |
| `Listbox.DetectMovementOrAnimationEnd`  | `Listbox.DetectListboxMovementOrAnimationEnd`   |
| `Combobox.LockScroll`                   | `Combobox.LockComboboxScroll`                   |
| `Combobox.UnlockScroll`                 | `Combobox.UnlockComboboxScroll`                 |
| `Combobox.InertOthers`                  | `Combobox.InertComboboxOthers`                  |
| `Combobox.RestoreInert`                 | `Combobox.RestoreComboboxInert`                 |
| `Combobox.FocusInput`                   | `Combobox.FocusComboboxInput`                   |
| `Combobox.ScrollIntoView`               | `Combobox.ScrollComboboxItemIntoView`           |
| `Combobox.ClickItem`                    | `Combobox.ClickComboboxItem`                    |
| `Combobox.DetectMovementOrAnimationEnd` | `Combobox.DetectComboboxMovementOrAnimationEnd` |
| `Popover.LockScroll`                    | `Popover.LockPopoverScroll`                     |
| `Popover.UnlockScroll`                  | `Popover.UnlockPopoverScroll`                   |
| `Popover.InertOthers`                   | `Popover.InertPopoverOthers`                    |
| `Popover.RestoreInert`                  | `Popover.RestorePopoverInert`                   |
| `Popover.FocusPanel`                    | `Popover.FocusPopoverPanel`                     |
| `Popover.FocusButton`                   | `Popover.FocusPopoverButton`                    |
| `Popover.DetectMovementOrAnimationEnd`  | `Popover.DetectPopoverMovementOrAnimationEnd`   |
