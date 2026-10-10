---
'@foldkit/ui': minor
---

Provide UI handlers with `UI.EffectsLayer` and register `UI.mounts` in `Application.make`. Applications selecting individual components can compose those components' `EffectsLayer` and `mounts` instead. Building the bundle installs no event listeners or DOM behavior; the relevant Command or lifecycle performs that work.

Give factory instances stable names. Replace `Toast.make(payloadSchema)` with `Toast.make(name, payloadSchema)` and `Slider.subscriptionsForRoot(getTrackRoot)` with `Slider.forRoot(name, getTrackRoot)`. Compose each returned instance's `EffectsLayer` and register its `subscriptions` where that instance is used. Instance names must be distinct within an application. Scene swipe events use `Subscription.emit(toast.subscriptions.swipePointer, message)` with the factory instance's registration.

Component Command names identify their owning component so several components can share one application handler Context. Update direct Command references using this table. Corresponding `Message.Completed*` variants include the same component name; for example, `Menu.Message.CompletedLockScroll` becomes `Menu.Message.CompletedLockMenuScroll`. Shared result facts such as `EndedAnimation` keep their names.

| Previous Command                        | Command                                         |
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
